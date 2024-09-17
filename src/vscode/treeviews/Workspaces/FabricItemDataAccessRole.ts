import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemConnection, iFabricApiItemDataAccessRole } from '../../../fabric/_types';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDataAccessRole extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItemDataAccessRole,
		parent: FabricWorkspaceTreeItem
	) {
		super(parent.id, definition.name, "ItemDataAccessRole", parent, definition, definition.name, vscode.TreeItemCollapsibleState.None);

		this.id = parent.id + "/" + definition.id,

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

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("accounts-view-bar-icon");
	}

	get itemDefinition(): iFabricApiItemDataAccessRole {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemDataAccessRole) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}