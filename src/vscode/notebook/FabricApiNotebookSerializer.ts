import * as vscode from 'vscode';

import { Buffer } from '@env/buffer';
import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../ThisExtension';
import { FabricApiNotebook, FabricApiNotebookCell } from './FabricApiNotebook';
import { FabricNotebookContext } from './FabricNotebookContext';
import { FabricApiTreeItem } from '../treeviews/FabricApiTreeItem';
import { FabricAPILanguage } from '../language/_types';
import { FABRIC_API_NOTEBOOK_TYPE } from './FabricApiNotebookKernel';

export class FabricApiNotebookSerializer implements vscode.NotebookSerializer {
	public readonly label: string = 'Fabric Notebook Serializer';

	public async deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): Promise<FabricApiNotebook> {
		var contents = Buffer.from(data).toString();

		// Read file contents
		let notebook: FabricApiNotebook;
		try {
			notebook = <FabricApiNotebook>JSON.parse(contents);
		} catch {
			ThisExtension.Logger.logInfo("Error parsing Notebook file. Creating new Notebook.");
			notebook = { cells: [] };
		}

		// read metadata into interactive object and return guid as reference
		notebook.metadata = FabricNotebookContext.loadFromMetadata(notebook.metadata);

		// Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
		return notebook;
	}

	public async serializeNotebook(data: FabricApiNotebook, token: vscode.CancellationToken): Promise<Uint8Array> {
		// Map the Notebook data into the format we want to save the Notebook data as
		let notebook: FabricApiNotebook = data;

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
			new FabricApiNotebookCell(vscode.NotebookCellKind.Markup, "Set API path for relative paths (already executed in the background for you)", "markdown"),
			new FabricApiNotebookCell(vscode.NotebookCellKind.Code, '%cmd\nSET API_PATH = ' + apiPath, FabricAPILanguage),
			new FabricApiNotebookCell(vscode.NotebookCellKind.Markup, "Type `./` to start autocomplete from relative API path. \n\n Type `/` for absolute API paths", "markdown"),
			new FabricApiNotebookCell(vscode.NotebookCellKind.Code, 'GET ./', FabricAPILanguage)
		];
		let notebook = new FabricApiNotebook(defaultCells);
		notebook.metadata = FabricNotebookContext.loadFromMetadata(notebook.metadata);

		const doc = await vscode.workspace.openNotebookDocument(FABRIC_API_NOTEBOOK_TYPE, notebook);
		let context: FabricNotebookContext = new FabricNotebookContext(apiPath);
		context.apiRootPath = apiPath;
		context.uri = doc.uri;
		FabricNotebookContext.set(notebook.metadata.guid, context)

		ThisExtension.NotebookKernel.setNotebookContext(doc, context);

		return vscode.window.showNotebookDocument(doc);
	}
}