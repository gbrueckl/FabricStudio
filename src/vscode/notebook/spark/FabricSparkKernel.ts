import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricApiItemFormat, iFabricApiItem, iFabricApiLakehouse } from '../../../fabric/_types';
import { iFabricApiLivySessionJsonResultSet, NotebookType, SparkLanguageConfigs, SparkNotebookLanguage, SparkNotebookMagic, SparkVSCodeLanguage } from './_types';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricSparkLivySession } from './FabricSparkLivySession';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://code.visualstudio.com/blogs/2021/11/08/custom-notebooks
export class FabricSparkKernel implements vscode.NotebookController {
	private static baseId: string = 'fabric-spark-';
	private static baseLabel: string = 'Fabric Spark - ';
	private static _instance: FabricSparkKernel;

	public id: string;
	public label: string;
	readonly description: string = 'Execute code on a remote Fabric Spark cluster';
	readonly notebookType: string;
	readonly supportedLanguages: SparkVSCodeLanguage[] = ["python", "sql", "r", "scala"];
	readonly supportsExecutionOrder: boolean = true;

	private _controller: vscode.NotebookController;
	private _executionOrder: number;
	readonly language: SparkNotebookLanguage;
	private _executionContexts: Map<string, FabricSparkLivySession>;
	readonly lakehouse: iFabricApiLakehouse;

	constructor(lakehouse: iFabricApiLakehouse, notebookType: NotebookType, language: SparkNotebookLanguage = "pyspark") {
		this.notebookType = notebookType;
		this.lakehouse = lakehouse;
		this.language = language;
		this.id = FabricSparkKernel.getId(this.lakehouse.id, notebookType);
		this.label = FabricSparkKernel.getLabel(this.lakehouse.displayName);

		this._executionOrder = 0;
		this._executionContexts = new Map<string, FabricSparkLivySession>();

		ThisExtension.Logger.logInfo("Creating new " + this.notebookType + " kernel '" + this.id + "'");
		this._controller = vscode.notebooks.createNotebookController(this.id,
			this.notebookType,
			this.label);

		this._controller.supportedLanguages = this.supportedLanguages;
		// this._controller.description = "Fabric Spark Cluster " + this.lakehouse.displayName;
		this._controller.description = `WorkspaceID: ${this.lakehouse.workspaceId}`;
		this._controller.supportsExecutionOrder = this.supportsExecutionOrder;
		this._controller.executeHandler = this.executeHandler.bind(this);
		this._controller.dispose = this.disposeController.bind(this);

		vscode.workspace.onDidOpenNotebookDocument((event) => this._onDidOpenNotebookDocument(event));

		ThisExtension.PushDisposable(this);
	}

	async _onDidOpenNotebookDocument(notebook: vscode.NotebookDocument) {
		// set this controller as recommended Kernel for notebooks opened via dbws:/, wsfs:/ file system or from or local sync folder
		if (notebook.uri.scheme == FABRIC_SCHEME) {
			this.Controller.updateNotebookAffinity(notebook, vscode.NotebookControllerAffinity.Preferred);
		}
	}

	// appears below the label
	get detail(): string {
		return undefined;
	}

	get Controller(): vscode.NotebookController {
		return this._controller;
	}

	static getId(kernelId: string, notebookType: NotebookType) {
		return kernelId + "-" + notebookType;
	}

	static getLabel(clusterName: string) {
		return this.baseLabel + clusterName;
	}

	get livyEndpoint(): string {
		return `https://api.fabric.microsoft.com/v1/workspaces/${this.lakehouse.workspaceId}/lakehouses/${this.lakehouse.id}/livyapi/versions/2023-12-01/`;
	}

	// #endregion

	async disposeController(): Promise<void> {
	}

	async dispose(): Promise<void> {
		this.Controller.dispose(); // bound to disposeController() above
	}

	private async initializeNotebookLivySession(notebook: vscode.NotebookDocument): Promise<FabricSparkLivySession> {
		const language = notebook.metadata?.metadata?.language_info?.name as SparkNotebookLanguage;

		let session: FabricSparkLivySession = await FabricSparkLivySession.getNewSession(this.lakehouse.workspaceId, this.lakehouse.id, language, notebook.uri);
		// persist the session for this notebook
		FabricSparkLivySession.set(notebook.uri.toString(), session);

		await session.waitTillStarted();

		return session;
	}

	async restart(notebookUri: vscode.Uri = undefined): Promise<void> {
		if (notebookUri == undefined) {
			ThisExtension.Logger.logInfo(`Restarting notebook kernel ${this.Controller.id} ...`)
			// we simply remove the current execution context and close it on the Cluster
			// the next execution will then create a new context
			await this.disposeController();
		}
		else {
			let livySession: FabricSparkLivySession = await FabricSparkLivySession.get(notebookUri.toString());
			ThisExtension.Logger.logInfo(`Restarting notebook kernel ${this.Controller.id} for notebook ${notebookUri.toString()} ...`);
			await livySession.stop();
		}
	}

	createNotebookCellExecution(cell: vscode.NotebookCell): vscode.NotebookCellExecution {
		//throw new Error('Method not implemented.');
		return null;
	}
	interruptHandler?: (notebook: vscode.NotebookDocument) => void | Thenable<void>;
	readonly onDidChangeSelectedNotebooks: vscode.Event<{ readonly notebook: vscode.NotebookDocument; readonly selected: boolean; }>;
	updateNotebookAffinity(notebook: vscode.NotebookDocument, affinity: vscode.NotebookControllerAffinity): void { }

	async executeHandler(cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument, controller: vscode.NotebookController): Promise<void> {
		let livySession: FabricSparkLivySession = await FabricSparkLivySession.get(notebook.uri.toString());
		if (!livySession) {
			ThisExtension.Logger.logInfo("Initializing Kernel ...");
			// for databricks-notebook type the language is in the metadata, for jupyter-notebook it defaults to the Kernel default "python"
			livySession = await this.initializeNotebookLivySession(notebook);

			ThisExtension.Logger.logInfo("Kernel initialized!");
		}
		for (let cell of cells) {
			const success = await this._doExecution(cell, livySession);
			if (!success) {
				break;
				//ThisExtension.Logger.logError(`Error executing cell ${cell.id}: ${result.error.message}`);
			}
			await Helper.wait(10); // Force some delay before executing/queueing the next cell
		}
	}

	private parseCell(cell: vscode.NotebookCell): [SparkNotebookLanguage, string, SparkNotebookMagic] {
		let cmd: string = cell.document.getText();
		let commandText: string = cmd;

		// defaults should come from current session?!
		const defaultLanguage = cell.notebook.metadata?.metadata?.language_info?.name as SparkNotebookLanguage;
		let language: SparkNotebookLanguage = defaultLanguage || "pyspark";
		let magicText: string = defaultLanguage || "pyspark";

		// Fabric uses '%%' for magics - Jupyter uses '%'
		if (cmd[0] == "%") {
			let lines = cmd.split('\n');
			const firstLineTokens = lines[0].split(" ").map(t => t.trim()).filter(t => t != "");

			if (firstLineTokens[0].startsWith("%run")) {
				magicText = firstLineTokens[0].slice(1).toLowerCase();

				if (firstLineTokens.length < 2) {
					throw new Error("Invalid %run command! Please provide the notebook name to run.");
				}
				//commandText = firstLineTokens.slice(1).join(" ");
			}
			else if (cmd[1] == "%") {
				magicText = firstLineTokens[0].slice(2).toLowerCase();
				commandText = lines.slice(1).join('\n');

				language = SparkLanguageConfigs.getLanguageByMagic(magicText as SparkNotebookMagic);
				if (!language) {
					throw new Error("Invalid magic!");
				}
			}
		}

		return [language, commandText, magicText as SparkNotebookMagic];
	}

	private async resolveRunMagic(commandText: string, livySession: FabricSparkLivySession): Promise<string> {
		const regex = /\%run (.+?)$/gm;
		// get all matches with groups
		const matches = [...commandText.matchAll(regex)];
		if (!matches) {
			return commandText;
		}
		let runWorkspaceId = await livySession.getRunWorkspaceId();

		const allNotebooks = await FabricApiService.listItems(runWorkspaceId, "Notebook");
		if (allNotebooks.error) {
			throw new Error(allNotebooks.error.message);
		}
		// Iterate over all matches found
		for (const match of matches) {
			ThisExtension.Logger.logInfo("Found %run match: " + match);

			const notebookName = match[1];
			const runNotebook = allNotebooks.success.find(n => n.displayName.toLowerCase() == notebookName.toLowerCase());

			if (!runNotebook) {
				throw new Error(`Notebook '${notebookName}' could not be found!`);
			}

			// get definition of Notebook in Source format
			let notebookDefinition = await FabricApiService.getItemDefinitionPart(runWorkspaceId, runNotebook.id, "notebook-content.py", FabricApiItemFormat.Source);

			if (notebookDefinition.error) {
				if (notebookDefinition.error.message == "Part with path 'notebook-content.py' not found in item definition!") {
					throw new Error(`Could not load notebook '${notebookName}': Only Python notebooks are currently supported`);
				}
			}
			// replace metadata and cell tags
			let notebookCode = notebookDefinition.success;
			notebookCode = notebookCode.replace(/^.* (META|CELL \*\*\*|Fabric notebook source).*$/gm, "");
			notebookCode = notebookCode.replace(/^\s*[\r\n]/gm, "");
			notebookCode = `\r\n${"#".repeat(100)}\r\n# CODE FROM '${notebookName}' (WorkspaceID: ${runWorkspaceId}):\r\n${"#".repeat(100)}\r\n` + notebookCode;

			commandText = commandText.replace(match[0], notebookCode);

			commandText = await this.resolveRunMagic(commandText, livySession);
		}
		return commandText.trim();
	}

	private parseCommandText(commandText: string, commentChar: string): string {
		let lines = commandText.split("\n");
		// remove comments based on comment-char of current language
		let linesWithoutComments = lines.filter(l => !l.trim().startsWith(commentChar));
		let commandTextClean = linesWithoutComments.join("\n");

		return commandTextClean;
	}

	private async _doExecution(cell: vscode.NotebookCell, livySession: FabricSparkLivySession): Promise<boolean> {
		const execution = this.Controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());
		execution.clearOutput();

		// wrap a try/catch around the whole execution to make sure we never get stuck
		try {
			let commandText: string = cell.document.getText();
			let magic: SparkNotebookMagic = null;
			let language: SparkNotebookLanguage = null;

			[language, commandText, magic] = this.parseCell(cell);

			ThisExtension.Logger.logInfo("Executing " + language + ":\n" + commandText);

			const commentChar = SparkLanguageConfigs.getCommentCharByLanguage(language);
			let commandTextClean = this.parseCommandText(commandText, commentChar);

			if (magic == "run") {
				commandTextClean = await this.resolveRunMagic(commandTextClean, livySession);

				execution.appendOutput(new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(commandTextClean, "text/plain")
				]))
			}

			const command = await livySession.executeCommand(commandTextClean, language);
			if (command.error) {
				execution.appendOutput(new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(command.error.message, "text/plain")
				]))
				execution.end(false, Date.now());
				return false;
			}

			execution.token.onCancellationRequested(() => {
				livySession.cancelCommand(command.success);

				execution.appendOutput(new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text("Execution cancelled!", 'text/plain'),
				]));

				execution.end(false, Date.now());
				return false;
			});

			const result = await livySession.waitForCommandResult(command.success.id)

			if (result.success) {
				if (result.success.output.status == "error") {
					let errorMsg: string = `${result.success.output.ename}: ${result.success.output.evalue}\n`;
					errorMsg += result.success.output.traceback.join("\n");
					execution.appendOutput(new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.text(errorMsg, "text/plain")
					]));
					execution.end(false, Date.now());
					return false;
				}

				for (let [mimeType, data] of Object.entries(result.success.output.data)) {
					if (mimeType == "application/json") {
						const jsonData = data as iFabricApiLivySessionJsonResultSet;
						let jsonResult: any[] = [];

						if (jsonData.data && jsonData.data.length == 0) {
							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text("<Empty result set>", 'text/plain')
							]));
						}
						else {
							for (let row of jsonData.data) {
								let newRow: any = {};
								for (let [index, col] of jsonData.schema.fields.entries()) {
									newRow[col.name] = row[index];
								}
								jsonResult.push(newRow);
							}
						}
						data = JSON.stringify(jsonResult);
					}
					execution.appendOutput(new vscode.NotebookCellOutput([
						new vscode.NotebookCellOutputItem(Buffer.from(data), mimeType)
					]));
				}
				execution.end(true, Date.now());
				return true;
			}
			else {
				execution.appendOutput(new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(result.error.message, "text/plain") // to be used by proper JSON/table renderers,
				]))
				execution.end(false, Date.now());
				return false;
			}
		} catch (error) {
			execution.appendOutput(new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(error.message, "text/plain")
			]));

			execution.end(false, Date.now());
			return false;
		}
	}
}
