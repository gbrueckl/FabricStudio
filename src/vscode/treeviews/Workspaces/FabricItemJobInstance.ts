import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemConnection, iFabricApiItemJobInstance } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemJobInstance extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemJobInstance,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.startTimeUtc, parent, undefined, "ItemJobInstance");

		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = this.getIcon();
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

	getIcon(): vscode.ThemeIcon {
		if (this.itemDefinition) {
			if (this.itemDefinition.status == "Completed") {
				return new vscode.ThemeIcon("check");
			}
			else if (this.itemDefinition.status.includes("Failed")) {
				return new vscode.ThemeIcon("error");
			}
			else {
				return new vscode.ThemeIcon("sync~spin");
			}
		}
	}

	get itemDefinition(): iFabricApiItemJobInstance {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemJobInstance) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}