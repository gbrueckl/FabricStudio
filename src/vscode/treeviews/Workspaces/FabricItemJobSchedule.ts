import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemJobSchedule } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemJobSchedule extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemJobSchedule,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, parent, definition.id, "ItemJobSchedule", true);

		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);
		this.description = this._description;

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
			return `${this.itemDefinition.configuration["type"]} - ${this.itemDefinition.configuration["times"] ?? this.itemDefinition.configuration["interval"]}`;
		}
	}

	getIcon(): vscode.ThemeIcon {
		if (this.itemDefinition) {
			if (this.itemDefinition.enabled) {
				return new vscode.ThemeIcon("pass-filled");
			}
			else {
				return new vscode.ThemeIcon("circle-large-outline");
			}
		}
	}

	get itemDefinition(): iFabricApiItemJobSchedule {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemJobSchedule) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}