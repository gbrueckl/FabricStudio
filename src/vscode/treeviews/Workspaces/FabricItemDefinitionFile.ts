import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItemDataAccessRole } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItem } from './FabricItem';
import { FabricItemDataAccessRole } from './FabricItemDataAccessRole';
import { FabricItemDefinition } from './FabricItemDefinition';
import { FabricItemDefinitionFolder } from './FabricItemDefinitionFolder';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinitionFile extends FabricWorkspaceTreeItem {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemDefinition | FabricItemDefinitionFolder
	) {
		super(`${parent.id}/${uri.path}`, "File", "ItemDefinitionFile", parent, "", "File", vscode.TreeItemCollapsibleState.None);

		this.itemId = parent.itemId;

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

	get parent(): FabricItemDefinition | FabricItemDefinitionFolder {
		return this._parent as FabricItemDefinition | FabricItemDefinitionFolder;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}
}