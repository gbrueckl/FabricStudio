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
import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemTags } from './FabricItemTags';
import { FabricAppliedTag } from './FabricAppliedTag';
import { FabricItemRelationsDownstream } from './FabricItemRelationsDownstream';
import { FabricItemRelationsUpstream } from './FabricItemRelationsUpstream';

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

	get itemApiPath(): string | undefined{
		return Helper.trimChar(Helper.joinPath(this.workspace.apiPath, "items", this.itemId), "/");
	}

	get refreshApiPaths(): string[] {
		const itemApiPath = this.itemApiPath;
		return Array.from(new Set([
			this.apiPath,
			itemApiPath,
			itemApiPath ? `${itemApiPath}/relations/upstream` : undefined,
			itemApiPath ? `${itemApiPath}/relations/downstream` : undefined
		].filter(path => path)));
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

	get canDelete(): boolean {
		return true;
	}

	get canMove(): boolean {
		return true;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			if (this.contextValue?.includes("EDIT_")) {
				children.push(new FabricItemDefinition(this));
			}

			const [tags, connections, upstreamRelations, downstreamRelations, shortcuts, jobInstances, jobSchedules, accessRoles] = await Promise.all([
				this.getTagsChild(),
				this.getConnectionsChild(),
				this.getRelationsChild(FabricItemRelationsUpstream, `Could not load upstream relations for item '${this.itemName}' (ID: ${this.itemId})`),
				this.getRelationsChild(FabricItemRelationsDownstream, `Could not load downstream relations for item '${this.itemName}'`),
				this.getShortcutsChild(),
				this.getJobInstancesChild(),
				this.getJobSchedulesChild(),
				this.getDataAccessRolesChild()
			]);

			children.push(...[tags, connections, upstreamRelations, downstreamRelations, shortcuts, jobInstances, jobSchedules, accessRoles]
				.filter((child): child is FabricWorkspaceTreeItem => child !== undefined));

			return children;
		}
	}

	private async getTagsChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		try {
			const tags = new FabricItemTags(this);
			const itemDefinition = await FabricApiService.get<iFabricApiItem>(this.itemApiPath);
			this.itemDefinition = itemDefinition.success;
			if (this.itemDefinition?.tags?.length > 0) {
				this.itemDefinition.tags.forEach(tag => tags.addChild(new FabricAppliedTag(tag, "ItemTag", tags)));
				return tags;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo("Could not load tags for item " + this.itemName);
		}
	}

	private async getConnectionsChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		try {
			const connections = new FabricItemConnections(this);
			const connectionChildren = await FabricApiTreeItem.getValidChildren(connections) as FabricWorkspaceTreeItem[];
			if (connectionChildren.length > 0) {
				connectionChildren.forEach(child => connections.addChild(child));
				return connections;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo("Could not load connections for item " + this.itemName);
		}
	}

	private async getRelationsChild<T extends FabricWorkspaceTreeItem>(relationType: new (parent: FabricItem) => T, errorMessage: string): Promise<T | undefined> {
		try {
			return new relationType(this);
		}
		catch (e) {
			ThisExtension.Logger.logInfo(errorMessage);
		}
	}

	private async getShortcutsChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		if (!["Lakehouse", "Warehouse", "AzureDatabricksStorage"].includes(this.itemType)) {
			return undefined;
		}

		try {
			const shortcuts = new FabricItemShortcuts(this);
			const shortcutChildren = await FabricApiTreeItem.getValidChildren(shortcuts) as FabricWorkspaceTreeItem[];
			if (shortcutChildren.length > 0) {
				shortcutChildren.forEach(child => shortcuts.addChild(child));
				return shortcuts;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo(`Could not load shortcuts for item '${this.itemName}' (ID: ${this.itemId})`);
		}
	}

	private async getJobInstancesChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		if (!["DataPipeline", "Lakehouse", "Warehouse", "Notebook", "SparkJobDefinition"].includes(this.itemType)) {
			return undefined;
		}

		try {
			const jobInstances = new FabricItemJobInstances(this);
			const jobInstanceChildren = await FabricApiTreeItem.getValidChildren(jobInstances) as FabricWorkspaceTreeItem[];
			if (jobInstanceChildren.length > 0) {
				jobInstanceChildren.forEach(child => jobInstances.addChild(child));
				return jobInstances;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo(`Could not load job instances for item '${this.itemName}' (ID: ${this.itemId})`);
		}
	}

	private async getJobSchedulesChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		if (!FabricMapper.ItemTypesWithJob.includes(this.itemType)) {
			return undefined;
		}

		try {
			const jobSchedules = new FabricItemJobSchedules(this);
			const jobScheduleChildren = await FabricApiTreeItem.getValidChildren(jobSchedules) as FabricWorkspaceTreeItem[];
			if (jobScheduleChildren.length > 0) {
				jobScheduleChildren.forEach(child => jobSchedules.addChild(child));
				return jobSchedules;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo(`Could not load job schedules for item '${this.itemName}' (ID: ${this.itemId})`);
		}
	}

	private async getDataAccessRolesChild(): Promise<FabricWorkspaceTreeItem | undefined> {
		if (this.itemType !== "Lakehouse") {
			return undefined;
		}

		try {
			const accessRoles = new FabricItemDataAccessRoles(this);
			const accessRoleChildren = await accessRoles.getChildren() as FabricWorkspaceTreeItem[];
			if (accessRoleChildren.length > 0) {
				accessRoleChildren.forEach(child => accessRoles.addChild(child));
				return accessRoles;
			}
		}
		catch (e) {
			ThisExtension.Logger.logInfo(`Could not load data access roles for item '${this.itemName}' (ID: ${this.itemId})`);
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
