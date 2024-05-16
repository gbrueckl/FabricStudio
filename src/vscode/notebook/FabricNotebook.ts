import * as vscode from 'vscode';

export const FabricNotebookType: string = 'fabric-notebook';

export class FabricNotebook extends vscode.NotebookData {
	// empty for now, might be extended in the future if new features are added
}

export class FabricNotebookCell extends vscode.NotebookCellData {

}

