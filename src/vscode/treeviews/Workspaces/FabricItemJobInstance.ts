import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemConnection, iFabricApiItemJobInstance } from '../../../fabric/_types';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemJobInstance extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItemJobInstance,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.startTimeUtc, "ItemJobInstance", parent, definition, definition.id, vscode.TreeItemCollapsibleState.None);

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
			return `${this.itemDefinition.status}`;
		}
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("extensions-remote");
	}

	get itemDefinition(): iFabricApiItemJobInstance {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemJobInstance) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}