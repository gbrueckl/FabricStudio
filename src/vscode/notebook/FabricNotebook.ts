import * as vscode from 'vscode';

export const FabricNotebookType: string = 'fabric-api-notebook';

export class FabricNotebook extends vscode.NotebookData {
	// empty for now, might be extended in the future if new features are added
}

export class FabricNotebookCell extends vscode.NotebookCellData {
	get magic(): string {
		if (this.value.startsWith("%")) {
			return this.value.split(" ")[0];
		}
	}

	set magic(newMagic: string) {
		if (this.value.startsWith("%")) {
			this.value = this.value.replace(this.magic, newMagic);
		}
		else {
			this.value = newMagic + "\n" + this.value;
		}
	}
}

