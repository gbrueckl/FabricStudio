import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItem } from './FabricItem';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { ThisExtension } from '../../../ThisExtension';
import { FabricItemDefinitionFolder } from './FabricItemDefinitionFolder';
import { Helper } from '@utils/Helper';
import { FabricItemDefinitionFile } from './FabricItemDefinitionFile';
import { FabricCommandBuilder } from '../../input/FabricCommandBuilder';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';
import { FabricMapper } from '../../../fabric/FabricMapper';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricFSCache } from '../../filesystemProvider/FabricFSCache';

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
		this.resourceUri = parent.fabricFsUri.uri;

		this.iconPath = new vscode.ThemeIcon("folder-library");
		//this.command = this.getCommand();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		// opposed to all other items, we want the context value to be based on the parent/super item!
		// this also means we need to set all generic actions again
		
		let actions: string[] = [
			this.itemType.toUpperCase(),
			"RELOAD_FROM_FABRIC"
		];

		const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(this.parent.itemType);
		if (FabricConfiguration.itemTypeHasDefinition(itemTypePlural)) {
			if (itemTypePlural == "SemanticModels") {
				actions.push("EDIT_TMDL")
			}
			else if (itemTypePlural == "Reports") {
				actions.push("EDIT_PBIR")
			}
			else {
				actions.push("EDIT_DEFINITION");
			}
		}

		if(this.resourceUri && FabricFSCache.unpublishedChanges(this.resourceUri)) {
			actions.push("PUBLISH");
		}

		return actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.jobType} - ${this.itemDefinition.invokeType}`;
		}
	}

	get canDelete(): boolean {
		return false;
	}

	getCommand(): vscode.Command {
		return {
			"title": "Show Definition",
			"command": "FabricStudio.Item.editDefinition",
			"arguments": [this]
		}
	}

	async getChildrenFromFS(currentItem: FabricItemDefinition | FabricItemDefinitionFolder, element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];
			let folders: FabricItemDefinitionFolder[] = [];
			let files: FabricItemDefinitionFile[] = [];

			try {
				const items = await vscode.workspace.fs.readDirectory(currentItem.resourceUri);

				for (let item of items) {
					if (item[1] == vscode.FileType.Directory) {
						const folder = new FabricItemDefinitionFolder(vscode.Uri.joinPath(currentItem.resourceUri, item[0]), currentItem);
						folders.push(folder);
					}
					else if (item[1] == vscode.FileType.File) {
						const file = new FabricItemDefinitionFile(vscode.Uri.joinPath(currentItem.resourceUri, item[0]), currentItem);
						files.push(file);
					}
				}

				folders = folders.sort((a, b) => a.itemName.localeCompare(b.itemName));
				files = files.sort((a, b) => a.itemName.localeCompare(b.itemName));

				children = (folders as FabricWorkspaceTreeItem[]).concat(files as FabricWorkspaceTreeItem[]);
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load definitions for item " + currentItem.parent.itemName, true);
			}

			return children;
		}
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		return this.getChildrenFromFS(this, element);
	}

	get fabricFsUri(): FabricFSUri {
		return this.parent.fabricFsUri;
	}

	get definitionRoot(): FabricItemDefinition {
		return this;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	// Item-specific functions
}