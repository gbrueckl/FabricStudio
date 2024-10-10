import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem } from '../../../fabric/_types';

import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItemConnections } from './FabricItemConnections';
import { FabricItemShortcuts } from './FabricItemShortcuts';
import { FabricItemDataAccessRoles } from './FabricItemDataAccessRoles';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItem extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.displayName, definition.type, parent, definition, definition.description);

		this.collapsibleState = vscode.TreeItemCollapsibleState.None;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = this.getIconPath();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

		return orig + actions.join(",") + ",";
	}

	get itemApiPath(): string {
		return Helper.joinPath(this.parent.parent.apiPath, "items", this.itemId) + "/";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceGenericFolder[] = [];

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			try {
				let connections = new FabricItemConnections(this);
				const connectionsChildren = await connections.getChildren();
				if (connectionsChildren.length > 0) {
					children.push(connections);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load connections for item " + this.workspace.itemName);
			}

			try {
				let shortcuts = new FabricItemShortcuts(this);
				const shortcutsChildren = await shortcuts.getChildren();
				if (shortcutsChildren.length > 0) {
					children.push(shortcuts);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load shortcuts for item " + this.workspace.itemName);
			}

			try {
				let accessRoles = new FabricItemDataAccessRoles(this);
				const accessRolesChildren = await accessRoles.getChildren();
				if (accessRolesChildren.length > 0) {
					children.push(accessRoles);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load data access roles for item " + this.workspace.itemName);
			}

			//children = Array.from(itemTypes.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

			return children;
		}
	}

	get itemDefinition(): iFabricApiItem {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItem) {
		this._itemDefinition = value;
	}

	// Item-specific functions
}