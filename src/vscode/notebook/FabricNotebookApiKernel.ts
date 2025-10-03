import * as vscode from 'vscode';
import * as lodash from 'lodash';

import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricNotebookContext } from './FabricNotebookContext';
import { QueryLanguage } from './_types';
import { iFabricApiResponse } from '../../fabric/_types';
import { FabricApiService } from '../../fabric/FabricApiService';

export type NotebookMagic =
	"api"
	| "cmd"
	;

// https://code.visualstudio.com/blogs/2021/11/08/custom-notebooks
export class FabricNotebookApiKernel implements vscode.NotebookController {
	private static baseId: string = 'fabric-api-';
	private static _instance: FabricNotebookApiKernel;

	readonly notebookType: string = 'fabric-api-notebook';
	readonly label: string;
	readonly supportedLanguages = ["fabric-api", "graphql"]; // any for now, should be DAX, M, ... in the future
	readonly supportsExecutionOrder: boolean = true;

	private _controller: vscode.NotebookController;
	private _executionOrder: number;

	constructor() {
		//this._apiRootPath = `v1.0/${FabricApiService.Org}/`;
		this.label = "Fabric REST API";

		this._executionOrder = 0;
	}

	static async getInstance(): Promise<FabricNotebookApiKernel> {
		if (FabricNotebookApiKernel._instance) {
			return FabricNotebookApiKernel._instance;
		}

		let kernel = new FabricNotebookApiKernel();

		ThisExtension.Logger.logInfo("Creating new Fabric API Kernel '" + kernel.id + "'");
		kernel._controller = vscode.notebooks.createNotebookController(kernel.id, kernel.notebookType, kernel.label);

		kernel._controller.label = kernel.label;
		kernel._controller.supportedLanguages = kernel.supportedLanguages;
		kernel._controller.description = kernel.description;
		kernel._controller.detail = kernel.detail;
		kernel._controller.supportsExecutionOrder = kernel.supportsExecutionOrder;
		kernel._controller.executeHandler = kernel.executeHandler.bind(kernel);
		kernel._controller.dispose = kernel.disposeController.bind(kernel);

		vscode.workspace.onDidOpenNotebookDocument((event) => kernel._onDidOpenNotebookDocument(event));

		ThisExtension.PushDisposable(kernel);

		this._instance = kernel;

		return this._instance;
	}

	async _onDidOpenNotebookDocument(notebook: vscode.NotebookDocument) {
		// set this controller as recommended Kernel for notebooks opened via dbws:/ file system or from or local sync folder
	}

	// #region Cluster-properties
	get id(): string {
		return FabricNotebookApiKernel.baseId + "generic";
	}

	// appears next to the label
	get description(): string {
		return "Generic Fabric REST API Kernel";
	}

	// appears below the label
	get detail(): string {
		return undefined;
	}

	get Controller(): vscode.NotebookController {
		return this._controller;
	}

	// #endregion

	async disposeController(): Promise<void> {
	}

	async dispose(): Promise<void> {
		this.Controller.dispose(); // bound to disposeController() above
	}

	public setNotebookContext(notebook: vscode.NotebookDocument, context: FabricNotebookContext): void {
		FabricNotebookContext.set(notebook.metadata.guid, context);
	}

	public getNotebookContext(notebook: vscode.NotebookDocument): FabricNotebookContext {
		return FabricNotebookContext.get(notebook.metadata.guid);
	}

	createNotebookCellExecution(cell: vscode.NotebookCell): vscode.NotebookCellExecution {
		//throw new Error('Method not implemented.');
		return null;
	}
	interruptHandler?: (notebook: vscode.NotebookDocument) => void | Thenable<void>;
	readonly onDidChangeSelectedNotebooks: vscode.Event<{ readonly notebook: vscode.NotebookDocument; readonly selected: boolean; }>;
	updateNotebookAffinity(notebook: vscode.NotebookDocument, affinity: vscode.NotebookControllerAffinity): void { }

	async executeHandler(cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument, controller: vscode.NotebookController): Promise<void> {
		let context: FabricNotebookContext = this.getNotebookContext(notebook);

		for (let cell of cells) {
			await this._doExecution(cell, context);
			await Helper.delay(10); // Force some delay before executing/queueing the next cell
		}
	}

	private parseCell(cell: vscode.NotebookCell): [QueryLanguage, string, NotebookMagic, string] {
		let cmd: string = cell.document.getText();
		let commandText: string = cmd;

		// default is API
		let language: QueryLanguage = "API";
		let magicText: string = "api";
		let customApi: string = undefined;

		if (cmd[0] == "%") {
			let lines = cmd.split('\n');
			const firstLineTokens = lines[0].split(" ").map(t => t.trim()).filter(t => t != "");
			magicText = firstLineTokens[0].slice(1).toLowerCase();
			customApi = firstLineTokens[1];
			commandText = lines.slice(1).join('\n');
			if (["api"].includes(magicText)) {
				language = magicText as QueryLanguage;
			}
			else if (["cmd"].includes(magicText)) {
				language = magicText as QueryLanguage;
			}
			else {
				throw new Error("Invalid magic! Only %api and %cmd are supported");
			}
		}
		else {
			const cmdCompare = cmd.toUpperCase().trim();
			if (cmdCompare.startsWith("SET")) {
				magicText = "cmd";
				language = "CMD";
			}
		}

		return [language, commandText, magicText as NotebookMagic, customApi];
	}

	private resolveRelativePath(endpoint: string, apiRootPath: string): string {
		if (!endpoint) {
			return apiRootPath;
		}
		if (endpoint.startsWith('./')) {
			endpoint = Helper.trimChar(Helper.joinPath(apiRootPath, endpoint.slice(2)), "/");
		}

		return endpoint;
	}

	private parseCommandText(commandText: string, context: FabricNotebookContext, cell: vscode.NotebookCell): string {
		let lines = commandText.split("\n");
		let linesWithoutComments = lines.filter(l => !l.trim().startsWith("#") && !l.trim().startsWith("//") && !l.trim().startsWith("--/"));
		let commandTextClean = linesWithoutComments.join("\n");

		for (let variable in context.variables) {
			commandTextClean = commandTextClean.replace(new RegExp(`\\$\\(${variable}\\)`, "gi"), context.variables[variable]);
		}

		const referencedOutputs = commandTextClean.matchAll(new RegExp(`\\$\\(\\_cells\\[(?<cellRef>-?\\d)](?<xPath>.*?)\\)`, "gi"))
		for (let cellVariable of referencedOutputs) {
			try {
				ThisExtension.Logger.logInfo("Cell-Reference found: " + cellVariable[0] + ". Trying to resolve it ...");
				const cellRef = cellVariable.groups["cellRef"];
				const xPath = Helper.trimChar(cellVariable.groups["xPath"], ".");
				const output = cell.notebook.cellAt(cell.index + parseInt(cellRef)).outputs[0];
				const jsonOutput = output.items.find(i => i.mime === 'application/json');
				let json = undefined;
				if ("data" in jsonOutput) {
					json = JSON.parse(jsonOutput.data.toString());
				}
				else {
					json = JSON.parse(jsonOutput);
				}

				let value = json;
				if (xPath) {
					value = lodash.get(json, xPath);
				}

				if (value) {
					if (value.toString().includes("[object Object]")) {
						value = JSON.stringify(value);
					}
					ThisExtension.Logger.logInfo("Resolved " + cellVariable[0] + " to value: '" + value + "'!");
					commandTextClean = commandTextClean.replace(cellVariable[0], value);
				}
				else {
					throw new Error("Could not resolve value for '" + cellVariable[0] + "'!");
				}
			}
			catch (error) {
				ThisExtension.Logger.logError(error.message, true);

				throw error;
			}
		}

		return commandTextClean;
	}

	private async _doExecution(cell: vscode.NotebookCell, context: FabricNotebookContext): Promise<void> {
		const execution = this.Controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this._executionOrder;
		execution.start(Date.now());
		execution.clearOutput();

		// wrap a try/catch around the whole execution to make sure we never get stuck
		try {
			let commandText: string = cell.document.getText();
			let magic: NotebookMagic = null;
			let language: QueryLanguage = null;
			let customApi: string = null;
			let flags: string[] = [];

			[language, commandText, magic, customApi] = this.parseCell(cell);

			ThisExtension.Logger.logInfo("Executing " + language + ":\n" + commandText);

			const commandTextClean = this.parseCommandText(commandText, context, cell);
			customApi = this.resolveRelativePath(customApi, context.apiRootPath);

			let result: iFabricApiResponse = undefined;
			switch (magic) {
				case "api":
					const parseRegEx = /(?<method>\w+?)\s+(?<endpoint>[^\s]+)(\s+|$)?(?<flags>[\w\s-]+?)?(\s+|$)?(?<body>{.*})?\s*$/s;
					const match = commandTextClean.match(parseRegEx);

					let method: string = "ERROR"; // will be overwritten unless an invalid command is given
					let endpoint: string = "";
					let body: any = undefined;

					if (match) {
						method = match.groups["method"].trim().toUpperCase();
						endpoint = match.groups["endpoint"].trim();
						let flagsString = match.groups["flags"];
						let bodyString = match.groups["body"];

						if (flagsString) {
							flags = flagsString.split(" ").map(f => f.trim()).filter(f => f != "");
						}

						if (bodyString) {
							// for parsing GraphQL queries with Newline/Linebreak: https://stackoverflow.com/questions/42068/how-do-i-handle-newlines-in-json
							body = JSON.parse(bodyString);
						}

						endpoint = this.resolveRelativePath(endpoint, customApi);
					}

					switch (method) {
						case "GET":
							result = (await FabricApiService.get<any>(endpoint, body));
							break;

						case "POST":
							result = (await FabricApiService.post<any>(endpoint, body));
							break;

						case "PUT":
							result = (await FabricApiService.put<any>(endpoint, body));
							break;

						case "PATCH":
							result = (await FabricApiService.patch<any>(endpoint, body));
							break;

						case "DELETE":
							result = (await FabricApiService.delete<any>(endpoint, body));
							break;

						case "ERROR":
							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text("Invalid command format! Please use the format: \nMETHOD /endpoint [flags] \n[body]"),
							]));

							execution.end(false, Date.now());
							return;

						default:
							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text("Only GET, POST, PUT, PATCH and DELETE are supported.")
							]));

							execution.end(false, Date.now());
							return;
					}

					if (result.error) {
						throw new Error(result.error.message);
					}
					break;
				case "cmd":
					const regex = /SET\s*(?<variable>[^=]*)(\s*=\s*(?<value>.*))?/i;
					let lines = commandTextClean.split("\n")
					for (let line of lines) {
						let match = regex.exec(line.trim());

						if (!match || !match.groups || !match.groups.variable) {
							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text(`Invalid format for %cmd magic in line '${line}'. \nPlease use format \nSET variable=value.`)
							]));

							execution.end(false, Date.now());
							return;
						}
						const varName = match.groups.variable.trim().toUpperCase();
						if (match.groups.variable && match.groups.value) {
							const varValue = match.groups.value.trim();
							context.setVariable(varName, varValue);

							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text(`Set variable ${varName} to '${varValue}'`),
							]));
						}
						else {
							const value = context.getVariable(varName);

							execution.appendOutput(new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text(`${varName} = ${value}`),
							]));
						}
					}

					execution.end(true, Date.now());
					return;
				default:
					execution.appendOutput(new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.text("Only %api and %cmd magics are currently supported."),
					]));

					execution.end(false, Date.now());
					return;
			}

			execution.token.onCancellationRequested(() => {
				execution.appendOutput(new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text("Execution cancelled!", 'text/plain'),
				]));

				execution.end(false, Date.now());
				return;
			});

			if (magic == "api") {
				result = result as iFabricApiResponse;

				let output: vscode.NotebookCellOutput;

				if (flags.includes("-H")) {
					let responseHeaders = result.responseHeaders || {};
					if (Object.keys(responseHeaders).length > 0) {
						execution.appendOutput(new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.json(responseHeaders, 'application/json'),
							vscode.NotebookCellOutputItem.text(JSON.stringify(responseHeaders), 'text/plain')
						]));
					} else {
						execution.appendOutput(new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.text("No response headers returned.", 'text/plain')
						]));
					}
				}

				if (result.success) {
					if (result.success.value) {
						output = new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.json(result.success.value, 'application/json') // to be used by proper JSON/table renderers
						])
					}
					else {
						output = new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.json(result.success, 'application/json'), // to be used by proper JSON/table renderers,
							vscode.NotebookCellOutputItem.text(result.success as any as string, 'text/plain') // to be used by proper JSON/table renderers
						])
					}
					execution.appendOutput(output);
					execution.end(true, Date.now());
				}
				else {
					execution.appendOutput(new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.json(result.error, 'application/json'),
						vscode.NotebookCellOutputItem.text(JSON.stringify(result.error), 'text/plain')
					]));

					execution.end(false, Date.now());
					return;
				}
			}
		} catch (error) {
			execution.appendOutput(new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text(error, 'text/plain')
			]));

			execution.end(false, Date.now());
			return;
		}
	}
}
