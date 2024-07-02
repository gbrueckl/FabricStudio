import * as vscode from 'vscode';

import { Buffer } from '@env/buffer';
import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../ThisExtension';
import { FabricNotebook, FabricNotebookCell, FabricNotebookType } from './FabricNotebook';
import { FabricNotebookContext } from './FabricNotebookContext';
import { FabricApiTreeItem } from '../treeviews/FabricApiTreeItem';
import { FabricAPILanguage } from '../language/_types';

export class FabricNotebookSerializer implements vscode.NotebookSerializer {
	public readonly label: string = 'Fabric Notebook Serializer';

	public async deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): Promise<FabricNotebook> {
		var contents = Buffer.from(data).toString();

		// Read file contents
		let notebook: FabricNotebook;
		try {
			notebook = <FabricNotebook>JSON.parse(contents);
		} catch {
			ThisExtension.Logger.logInfo("Error parsing Notebook file. Creating new Notebook.");
			notebook = { cells: [] };
		}

		// read metadata into interactive object and return guid as reference
		notebook.metadata = FabricNotebookContext.loadFromMetadata(notebook.metadata);

		// Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
		return notebook;
	}

	public async serializeNotebook(data: FabricNotebook, token: vscode.CancellationToken): Promise<Uint8Array> {
		// Map the Notebook data into the format we want to save the Notebook data as
		let notebook: FabricNotebook = data;

		notebook.metadata = FabricNotebookContext.saveToMetadata(notebook.metadata);

		// Give a string of all the data to save and VS Code will handle the rest
		return await Buffer.from(JSON.stringify(notebook));
	}

	static async openNewNotebook(apiItem: FabricApiTreeItem): Promise<vscode.NotebookEditor> {
		let apiPath = "/workspaces";

		if (apiItem) {
			apiPath = '/' + Helper.trimChar(apiItem.apiPath.split("/").slice(1).join("/"), "/", false, true);
		}

		let defaultCells = [
			new FabricNotebookCell(vscode.NotebookCellKind.Markup, "Set API path for relative paths (already executed in the background for you)", "markdown"),
			new FabricNotebookCell(vscode.NotebookCellKind.Code, '%cmd\nSET API_PATH = ' + apiPath, FabricAPILanguage),
			new FabricNotebookCell(vscode.NotebookCellKind.Markup, "Type `./` to start autocomplete from relative API path. \n\n Type `/` for absolute API paths", "markdown"),
			new FabricNotebookCell(vscode.NotebookCellKind.Code, 'GET ./', FabricAPILanguage)
		];
		let notebook = new FabricNotebook(defaultCells);
		notebook.metadata = FabricNotebookContext.loadFromMetadata(notebook.metadata);

		const doc = await vscode.workspace.openNotebookDocument(FabricNotebookType, notebook);
		let context: FabricNotebookContext = new FabricNotebookContext(apiPath);
		context.apiRootPath = apiPath;
		context.uri = doc.uri;
		FabricNotebookContext.set(notebook.metadata.guid, context)

		ThisExtension.NotebookKernel.setNotebookContext(doc, context);

		return vscode.window.showNotebookDocument(doc);
	}
}