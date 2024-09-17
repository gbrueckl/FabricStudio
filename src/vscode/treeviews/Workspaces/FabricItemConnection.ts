import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem, iFabricApiItemConnection } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemConnection extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItemConnection,
		parent: FabricWorkspaceTreeItem
	) {
		super(parent.id, definition.connectionDetails.type, "ItemConnection", parent, definition, definition.connectionDetails.path, vscode.TreeItemCollapsibleState.None);

		this.id = parent.id + "/" + definition.connectionDetails.path,

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
		return new vscode.ThemeIcon("extensions-remote");
	}

	get itemDefinition(): iFabricApiItemConnection {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemConnection) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}