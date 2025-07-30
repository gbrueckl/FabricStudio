import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem, iFabricApiWorkspaceFolder } from '../../../fabric/_types';
import { FabricItemConnections } from './FabricItemConnections';
import { FabricItemShortcuts } from './FabricItemShortcuts';
import { FabricItemDataAccessRoles } from './FabricItemDataAccessRoles';
import { FabricItemJobInstances } from './FabricItemJobInstances';
import { FabricItemJobSchedules } from './FabricItemJobSchedules';
import { FabricMapper } from '../../../fabric/FabricMapper';
import { FabricItemDefinition } from './FabricItemDefinition';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';

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

		let actions: string[] = [
			"FABRIC_ITEM"
		];

		return orig + actions.join(",") + ",";
	}

	get itemDefinition(): iFabricApiItem {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItem) {
		this._itemDefinition = value;
	}

	get itemApiPath(): string {
		return Helper.trimChar(Helper.joinPath(this.workspace.apiPath, "items", this.itemId), "/");
	}

	get apiUrlPart(): string {
		if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
			// if "by Folder" is used, we do not have the artificial folder for our item types so we have to add it manually
			const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(this.itemType);
			return `${itemTypePlural}/${this.itemId}`;
		}
		return super.apiUrlPart;
	}

	get canRename(): boolean {
		return true;	
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
				const connectionsChildren = await FabricApiTreeItem.getValidChildren(connections);
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
					const shortcutsChildren = await FabricApiTreeItem.getValidChildren(shortcuts);
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
					const jobInstancesChildren = await FabricApiTreeItem.getValidChildren(jobInstances);
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
					let jobSchedules = new FabricItemJobSchedules(this);
					const jobSchedulesChildren = await FabricApiTreeItem.getValidChildren(jobSchedules);
					if (jobSchedulesChildren.length > 0) {
						children.push(jobSchedules);
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
					const accessRolesChildren = await FabricApiTreeItem.getValidChildren(accessRoles);
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

	// Item-specific functions
	static async moveToFolder(sourceItem: iFabricApiItem, targetFolder?: iFabricApiWorkspaceFolder): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/folders/move-folder?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb/folders/dddddddd-9999-0000-1111-eeeeeeeeeeee/move
		{
			"targetFolderId": "cccccccc-8888-9999-0000-dddddddddddd"
		}
		*/

		const apiPath = `v1/workspaces/${sourceItem.workspaceId}/items/${sourceItem.id}/move`;
		let body = {};
		if (targetFolder) {
			body = { "targetFolderId": targetFolder.id };
		}
		const response = await FabricApiService.post(apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully moved ${sourceItem.type} '${sourceItem.displayName}' to Folder '${targetFolder.displayName}'!`, 3000);
		}
	}
}