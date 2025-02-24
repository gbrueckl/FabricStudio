import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItem } from './FabricItem';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinition extends FabricWorkspaceTreeItem {
	constructor(
		parent: FabricItem
	) {
		super(parent.itemId + "/Definition", "Definition", "ItemDefinition", parent, undefined, "Show Definition", vscode.TreeItemCollapsibleState.None);

		this.itemId = parent.id;
		this.itemDefinition = parent.itemDefinition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = new vscode.ThemeIcon("folder-library");
		this.command = this.getCommand();;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

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

	get fabricFsUri(): FabricFSUri {
		return this.parent.fabricFsUri;
	}

	get apiUrlPart(): string {
		return "";
	}

	// Item-specific functions
}