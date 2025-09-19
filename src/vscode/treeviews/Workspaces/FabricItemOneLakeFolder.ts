import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItemOneLake } from './FabricItemOneLake';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemOneLakeFolder extends FabricWorkspaceGenericFolder {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemOneLake | FabricItemOneLakeFolder
	) {
		super(`${parent.id}/${uri.path}`, "Folder", "OneLakeFolder", parent, "");

		this.id = `${parent.id}/${uri.path}`;
		this.itemId = parent.itemId;
		this.itemName = uri.path.split('/').pop();

		this.resourceUri = uri;
		// below values are derived from resourceUri!
		this.iconPath = undefined;
		this.label = undefined;
		this.description = undefined;
	}

	get _contextValue(): string {
		return this.OneLakeRoot._contextValue;
	}

	get parent(): FabricItemOneLake | FabricItemOneLakeFolder {
		return this._parent as FabricItemOneLake | FabricItemOneLakeFolder;
	}

	get OneLakeRoot(): FabricItemOneLake {
		return this.parent.OneLakeRoot;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		return this.OneLakeRoot.getChildrenFromFS(this, element);
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	get canDelete(): boolean {
		return false;
	}

	get canMove(): boolean {
		return false;
	}

	get canRename(): boolean {	
		return false;
	}

	get canOpenInBrowser(): boolean {
		return false;
	}
}