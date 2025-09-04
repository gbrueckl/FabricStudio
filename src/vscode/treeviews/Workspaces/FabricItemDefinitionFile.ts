import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItemDefinition } from './FabricItemDefinition';
import { FabricItemDefinitionFolder } from './FabricItemDefinitionFolder';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinitionFile extends FabricWorkspaceTreeItem {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemDefinition | FabricItemDefinitionFolder
	) {
		super(`${parent.id}/${uri.path}`, "File", "ItemDefinitionFile", parent, "", "File", vscode.TreeItemCollapsibleState.None);

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
		return this.definitionRoot._contextValue;
	}

	get parent(): FabricItemDefinition | FabricItemDefinitionFolder {
		return this._parent as FabricItemDefinition | FabricItemDefinitionFolder;
	}

	get definitionRoot(): FabricItemDefinition {
		return this.parent.definitionRoot;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	get fabricFsUri(): FabricFSUri {
		if (this.resourceUri) {
			return new FabricFSUri(this.resourceUri);
		}
	}

	get canDelete(): boolean {
		return false;
	}
}