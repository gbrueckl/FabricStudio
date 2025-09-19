import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItemOneLake } from './FabricItemOneLake';
import { FabricItemOneLakeFolder } from './FabricItemOneLakeFolder';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemOneLakeFile extends FabricWorkspaceTreeItem {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemOneLake | FabricItemOneLakeFolder
	) {
		super(`${parent.id}/${uri.path}`, "File", "OneLakeFile", parent, "", "File", vscode.TreeItemCollapsibleState.None);

		this.itemId = parent.itemId;
		this.itemName = uri.path.split('/').pop();
		this.itemDefinition = vscode.workspace.fs.readFile(uri);

		this.command = {
			"title": "Open File",
			"command": "vscode.open",
			"arguments": [uri],
		}

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