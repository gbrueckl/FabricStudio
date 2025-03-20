import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItem } from './FabricItem';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { ThisExtension } from '../../../ThisExtension';
import { FabricItemDefinitionFolder } from './FabricItemDefinitionFolder';
import { Helper } from '@utils/Helper';
import { FabricItemDefinitionFile } from './FabricItemDefinitionFile';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinition extends FabricWorkspaceTreeItem {
	constructor(
		parent: FabricItem
	) {
		super(parent.itemId + "/Definition", "Definition", "ItemDefinition", parent, undefined, "Show Definition", vscode.TreeItemCollapsibleState.Collapsed);

		this.itemId = parent.id;
		this.itemDefinition = parent.itemDefinition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = new vscode.ThemeIcon("folder-library");
		//this.command = this.getCommand();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["RELOAD_FROM_FABRIC"];

		return orig + actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.jobType} - ${this.itemDefinition.invokeType}`;
		}
	}

	getCommand(): vscode.Command {
		return {
			"title": "Show Definition",
			"command": "FabricStudio.Item.editDefinition",
			"arguments": [this]
		}
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

	get fabricFsUri(): FabricFSUri {
		return this.parent.fabricFsUri;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	// Item-specific functions
}