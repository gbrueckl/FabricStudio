import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem } from '../../../fabric/_types';
import { FabricItemConnections } from './FabricItemConnections';
import { FabricItemShortcuts } from './FabricItemShortcuts';
import { FabricItemDataAccessRoles } from './FabricItemDataAccessRoles';
import { FabricItemJobInstances } from './FabricItemJobInstances';
import { FabricItemJobSchedules } from './FabricItemJobSchedules';
import { FabricMapper } from '../../../fabric/FabricMapper';
import { FabricItemDefinition } from './FabricItemDefinition';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItem extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.displayName, definition.type, parent, definition, definition.description);

		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		FabricFSUri.addItemNameIdMap(this.itemName, this.itemId, this.workspaceId, this.itemType);

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
		let children: FabricWorkspaceTreeItem[] = [];

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			if (this.contextValue.includes("EDIT_")) {
				children.push(new FabricItemDefinition(this));
			}
			// Connections
			let supportedItemTypes: FabricApiItemType[] = [];
			try {
				let connections = new FabricItemConnections(this);
				const connectionsChildren = await connections.getChildren();
				if (connectionsChildren.length > 0) {
					children.push(connections);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load connections for item " + this.itemName);
			}

			// ShortCuts
			supportedItemTypes = ["Lakehouse", "Warehouse"];
			if (supportedItemTypes.includes(this.itemType)) {
				try {
					let shortcuts = new FabricItemShortcuts(this);
					const shortcutsChildren = await shortcuts.getChildren();
					if (shortcutsChildren.length > 0) {
						children.push(shortcuts);
					}
				}
				catch (e) {
					ThisExtension.Logger.logInfo("Could not load shortcuts for item " + this.itemName);
				}
			}

			// JobInstances
			supportedItemTypes = ["DataPipeline", "Lakehouse", "Warehouse", "Notebook", "SparkJobDefinition"];
			if (supportedItemTypes.includes(this.itemType)) {
				try {
					let jobInstances = new FabricItemJobInstances(this);
					const jobInstancesChildren = await jobInstances.getChildren();
					if (jobInstancesChildren.length > 0) {
						children.push(jobInstances);
					}
				}
				catch (e) {
					ThisExtension.Logger.logInfo("Could not load job instances for item " + this.itemName);
				}
			}

			// JobSchedules
			if (FabricMapper.ItemTypesWithJob.includes(this.itemType)) {
				try {
					let jobInstances = new FabricItemJobSchedules(this);
					const jobInstancesChildren = await jobInstances.getChildren();
					if (jobInstancesChildren.length > 0) {
						children.push(jobInstances);
					}
				}
				catch (e) {
					ThisExtension.Logger.logInfo("Could not load job instances for item " + this.itemName);
				}
			}

			// DataAccessRoles are currently only supported for Lakehouses
			supportedItemTypes = ["Lakehouse"];
			if (supportedItemTypes.includes(this.itemType)) {
				try {
					let accessRoles = new FabricItemDataAccessRoles(this);
					const accessRolesChildren = await accessRoles.getChildren();
					if (accessRolesChildren.length > 0) {
						children.push(accessRoles);
					}
				}
				catch (e) {
					ThisExtension.Logger.logInfo("Could not load data access roles for item " + this.itemName);
				}
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