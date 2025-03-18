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
import { FabricItemDefinitionFile } from './FabricItemDefinitionFile';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinitionFolder extends FabricWorkspaceGenericFolder {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemDefinition | FabricItemDefinitionFolder
	) {
		super(`${parent.id}/${uri.path}`, "Folder", "ItemDefinitionFolder", parent, "");

		this.id = `${parent.id}/${uri.path}`;
		this.itemId = parent.itemId;

		this.resourceUri = uri;
		// below values are derived from resourceUri!
		this.iconPath = undefined;
		this.label = undefined;
		this.description = undefined;
	}

	get parent(): FabricItemDefinition | FabricItemDefinitionFolder {
		return this._parent as FabricItemDefinition | FabricItemDefinitionFolder;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];

			try {
				const items = await vscode.workspace.fs.readDirectory(this.resourceUri);

				for (let item of items) {
					if (item[1] == vscode.FileType.Directory) {
						const folder = new FabricItemDefinitionFolder(vscode.Uri.joinPath(this.resourceUri, item[0]), this);
						children.push(folder);
					}
					else if (item[1] == vscode.FileType.File) {
						const file = new FabricItemDefinitionFile(vscode.Uri.joinPath(this.resourceUri, item[0]), this);
						children.push(file);
					}
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load definitions for item " + this.parent.itemName);
			}

			return children;
		}
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}
}