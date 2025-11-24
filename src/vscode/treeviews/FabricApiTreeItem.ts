import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricQuickPickItem } from '../input/FabricQuickPickItem';
import { FabricApiItemType } from '../../fabric/_types';
import { ThisExtension, TreeProviderId } from '../../ThisExtension';
import { FabricCommandBuilder } from '../input/FabricCommandBuilder';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { FabricMapper } from '../../fabric/FabricMapper';
import { iGenericApiError } from '@utils/_types';
import { FabricWorkspaceTreeItem } from './Workspaces/FabricWorkspaceTreeItem';
import { FabricWorkspaceFolder } from './Workspaces/FabricWorkspaceFolder';


export const NO_ITEMS_ITEM_ID: string = "NO_ITEMS";
export const ERROR_ITEM_ID: string = "ERROR_ITEM";

export class FabricApiTreeItem extends vscode.TreeItem {
	protected _itemType: FabricApiItemType;
	protected _itemId: UniqueId;
	protected _itemName: string;
	protected _itemDescription: string;
	protected _itemDefinition: any;
	protected _parent?: FabricApiTreeItem;

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricApiTreeItem = undefined,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(name, collapsibleState);

		this._itemId = id;
		this._itemName = name;
		this._itemType = type;
		this._parent = parent;
		this._itemDefinition = definition;
		this._itemDescription = description;

		this.id = id;
		this.tooltip = this.getToolTip(definition);
		this.description = this._description;
		this.contextValue = this._contextValue;

		this.iconPath = this.getIconPath();

		FabricCommandBuilder.pushQuickPickApiItem(this);
	}

	protected getIconPath(): string | vscode.Uri {
		return Helper.getIconPath(this.itemType);
	}

	// tooltip shown when hovering over the item
	protected getToolTip(definition: any) {
		if (!definition) return undefined;

		let tooltip: string = "";
		for (const [key, value] of Object.entries(definition)) {
			if (!value) continue; // skip empty values
			if (typeof value === "string") {
				if (value.length > 100 || value.length < 1) {
					continue;
				}
			}
			tooltip += `${key}: ${JSON.stringify(value, null, 4)}\n`;
		}

		return tooltip.trim();
	}

	// description is show next to the label
	get _description(): string {
		return `${this.itemType} - ID: ${this.itemId}`;
	}

	// used in package.json to filter commands via viewItem =~ /.*,GROUP,.*/
	get _contextValue(): string {
		let actions: string[] = [
			this.itemType.toUpperCase(),
			"COPY_ID",
			"COPY_NAME",
			"COPY_PATH",
			"COPY_PROPERTIES",
			"INSERT_CODE",
			"OPEN_API_NOTEBOOK"
		];
		if (this.canOpenInBrowser) {
			actions.push("OPEN_IN_BROWSER");
		}
		if (this.canDelete) {
			actions.push("DELETE");
		}
		if (this.canRename) {
			actions.push("RENAME");
		}
		return `,${actions.join(',')},`;
	}

	// can be overwritten in derived classes to disable "Open in Fabric Server"
	public get canOpenInBrowser(): boolean {
		return true;
	}

	// can be overwritten in derived classes to disable "Delete"
	public get canDelete(): boolean {
		return true;
	}

	public get canRename(): boolean {
		return false;
	}

	public static async delete(confirmation: "yesNo" | "name" | "none" | undefined = undefined, item: FabricApiTreeItem): Promise<void> {
		if (confirmation) {
			let confirm: string
			switch (confirmation) {
				case "yesNo":
					const confirmQp = await FabricCommandBuilder.showQuickPick([new FabricQuickPickItem("yes"), new FabricQuickPickItem("no")], `Do you really want to delete ${item.itemType.toLowerCase()} '${item.itemName}'?`, undefined, undefined);
					confirm = confirmQp?.value || "no";
					break;
				case "name":
					confirm = await FabricCommandBuilder.showInputBox("", `Confirm deletion by typeing the ${item.itemType.toLowerCase()} name '${item.itemName}' again.`, undefined, undefined);
					break;
				case "none":
					confirm = "none";
			}

			if (!confirm
				|| (confirmation == "name" && confirm != item.itemName)
				|| (confirmation == "yesNo" && confirm != "yes")) {
				const abortMsg = `Aborted deletion of ${item.itemType.toLowerCase()} '${item.itemName}'!`
				ThisExtension.Logger.logWarning(abortMsg);
				Helper.showTemporaryInformationMessage(abortMsg, 2000)
				return;
			}
		}

		const response = await FabricCommandBuilder.execute<any>(item.apiPath, "DELETE", []);
		if (response.error) {
			const errorMsg = response.error.message;
			vscode.window.showErrorMessage(errorMsg);
		}
		else {
			const successMsg = `Deleted ${item.itemType.toLowerCase()} '${item.itemName}'!`
			Helper.showTemporaryInformationMessage(successMsg, 3000);

			if (item.parent && confirmation != "none") {
				ThisExtension.refreshTreeView(item.treeProvider, item.parent);
			}
		}
	}

	public async rename(): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/admin/domains/update-domain
		/*
		PATCH https://api.fabric.microsoft.com/v1/admin/domains/{domainId}
		{
			"displayName": "Domain's new name",
			"description": "Domain's new description",
			"contributorsScope": "SpecificUsersAndGroups"
		}
		*/
		const newName = await vscode.window.showInputBox({
			title: `Rename ${this.itemType}`,
			ignoreFocusOut: true,
			prompt: `Enter new name for ${this.itemType} '${this.itemName}'`,
			placeHolder: this.itemName,
			value: this.itemName
		});
		if (!newName) {
			ThisExtension.Logger.logError("No name for rename provided, aborting operation.", true);
			return undefined;
		}
		let body = {
			"displayName": newName,
		};

		const response = await FabricApiService.patch(this.apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully renamed ${this.itemType} '${this.itemName}' to '${newName}'!`, 3000);
			// Update the local domain data
			this.itemName = newName;
			this.label = newName;
		}

		if (this.parent) {
			ThisExtension.refreshTreeView(this.treeProvider, this.parent);
		}
	}

	public async getChildren(element?: FabricApiTreeItem): Promise<FabricApiTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	/* FabricWorkspaceItem implementatin */
	get itemDefinition(): any {
		return this._itemDefinition;
	}

	set itemDefinition(value: any) {
		this._itemDefinition = value;
	}

	get itemName(): string {
		return this._itemName;
	}

	set itemName(value: string) {
		this._itemName = value;
	}

	get itemType(): FabricApiItemType {
		return this._itemType;
	}

	set itemType(value: FabricApiItemType) {
		this._itemType = value;
	}

	get itemId(): UniqueId {
		return this._itemId;
	}

	set itemId(value: UniqueId) {
		this._itemId = value;
	}

	get parent(): FabricApiTreeItem {
		return this._parent;
	}

	set parent(value: FabricApiTreeItem) {
		this._parent = value;
	}

	get treeProvider(): TreeProviderId {
		throw new Error("Method not implemented.");
	}

	getParentByType<T = FabricApiTreeItem>(type: FabricApiItemType): T {
		let parent: FabricApiTreeItem = this;

		while (parent !== undefined && parent.itemType !== type) {
			parent = parent.parent;
		}

		return parent as T;
	}

	public copyIdToClipboard(): void {
		vscode.env.clipboard.writeText(this.itemId.toString());
	}

	public copyNameToClipboard(): void {
		vscode.env.clipboard.writeText(this.itemName);
	}

	public copyPathToClipboard(): void {
		vscode.env.clipboard.writeText(this.apiPath);
	}

	public async copyPropertiesToClipboard(): Promise<void> {
		let definition = this.itemDefinition;

		try
		{
			const response = await FabricApiService.get(this.apiPath);

			if(response.success) {
				definition = response.success;
			}
		} catch (error) {
			ThisExtension.Logger.logWarning(`Could not retrieve latest properties for item '${this.itemName}', using cached definition. Error: ${error}`, false);
		}
		vscode.env.clipboard.writeText(JSON.stringify(definition, null, 4));
	}

	public getBrowserLink(): vscode.Uri {
		//https://app.powerbi.com/groups/ccce57d1-10af-1234-1234-665f8bbd8458/datasets/7cdff921-9999-8888-b0c8-34be20567742

		return vscode.Uri.joinPath(vscode.Uri.parse(FabricApiService.BrowserBaseUrl), FabricMapper.mapForBrowserUrl(this.itemPath.toLowerCase()));
	}

	public openInBrowser(): void {
		const tenantParam = FabricApiService.TenantId ? `?ctid=${FabricApiService.TenantId}` : "";
		const fullLink = `${this.getBrowserLink()}${tenantParam}`;

		Helper.openLink(fullLink);
	}

	get apiUrlPart(): string {
		if (this.itemType.endsWith("s")) {
			return this.itemType.toLowerCase();
		}
		if (this.itemId) {
			return this.itemId;
		}
		return this.id;
	}

	get itemPath(): string {
		// the parent-structure of the treeview due to WorkspaceFolders cannot be translated to the API path directly
		// if the root item is a WorkspaceFolder, we need to add the folderId and "folders" to the path
		// if and item resides in a workspaceFolder
		let urlParts: string[] = [];
		let apiItem: FabricApiTreeItem = this;
		let folder: FabricWorkspaceFolder = undefined;
		let rootItemIsFolder: boolean = apiItem.itemType === "WorkspaceFolder";

		if (rootItemIsFolder) {
			urlParts.push(apiItem.itemId, "folders");
		}

		while (apiItem) {
			if (apiItem.itemType === "WorkspaceFolder") {
				// skip workspace folders when building the API path
			}
			else if (apiItem.apiUrlPart) {
				urlParts.push(apiItem.apiUrlPart)
			}
			apiItem = apiItem.parent;
		}
		urlParts = urlParts.filter(x => x.length > 0);

		return `${urlParts.reverse().join("/")}`;
	}

	get apiPath(): string {
		return `v1/${this.itemPath}/`;
	}

	get asQuickPickItem(): FabricQuickPickItem {
		let qpItem = new FabricQuickPickItem(this.itemName, this.itemId, this.itemId);
		qpItem.apiItem = this;
		qpItem.itemType = this.itemType;

		return qpItem;
	}

	async insertCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined) {
			return;
		}

		const start = editor.selection.start;
		const end = editor.selection.end;
		const range = new vscode.Range(start.line, start.character, end.line, end.character);
		await editor.edit((editBuilder) => {
			editBuilder.replace(range, this.code);
		});
	}

	get code(): string {
		return Helper.trimChar("/" + this.apiPath.split("/").slice(2).join("/"), "/", false);
	}

	// API Drop
	get apiDrop(): string {
		return Helper.trimChar("/" + this.apiPath.split("/").slice(2).join("/"), "/", false);
	}

	public static get NO_ITEMS(): FabricApiTreeItem {
		let item = new FabricApiTreeItem(Helper.newGuid(), "No items found!", "GenericItem", undefined, undefined, undefined, vscode.TreeItemCollapsibleState.None);
		item.contextValue = "";
		item.itemId = NO_ITEMS_ITEM_ID;
		item.tooltip = "No items found!";
		item.description = undefined;
		item.iconPath = new vscode.ThemeIcon("array");
		return item;
	}

	public static ERROR_ITEM<T>(error: iGenericApiError): T {
		let item = new FabricApiTreeItem(Helper.newGuid(), `ERROR: ${error.errorCode}`, "GenericItem", undefined, undefined, undefined, vscode.TreeItemCollapsibleState.None);
		item.contextValue = "";
		item.description = error.message;
		item.tooltip = error.details || error.message;
		item.iconPath = new vscode.ThemeIcon("error");
		item.itemId = ERROR_ITEM_ID;
		return item as T;
	}

	public static handleEmptyItems<T>(items: T[], filter: RegExp = undefined, itemType: string = "item"): T[] {
		if (!items || items.length == 0) {
			if (filter) {
				ThisExtension.Logger.logWarning(`No ${itemType}s found matching the filter '${filter.source}'!`, true);
			}
			else {
				ThisExtension.Logger.logWarning(`No ${itemType}s found! Make sure you have permissions on at least one ${itemType}!`, true);
			}
			items = [this.NO_ITEMS as T];
		}
		return items;
	}		

	public static async getValidChildren(item: FabricApiTreeItem): Promise<FabricApiTreeItem[]> {
		let children: FabricApiTreeItem[] = await item.getChildren();
		children = children.filter((child) => ![NO_ITEMS_ITEM_ID, ERROR_ITEM_ID].includes(child.itemId))

		return children;
	}

	public toJSON(): any {
		return {
			itemId: this.itemId,
			itemName: this.itemName,
			apiPath: this.apiPath,
			itemType: this.itemType,
			itemDefinition: this.itemDefinition,
			canDelete: this.canDelete,
			canRename: this.canRename,
			canOpenInBrowser: this.canOpenInBrowser,
			treeProvider: this.treeProvider,
			contextValue: this.contextValue
		};	
	}
}