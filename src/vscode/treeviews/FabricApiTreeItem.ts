import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricQuickPickItem } from '../input/FabricQuickPickItem';
import { FabricApiItemType } from '../../fabric/_types';
import { ThisExtension, TreeProviderId } from '../../ThisExtension';
import { FabricCommandBuilder } from '../input/FabricCommandBuilder';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { FabricMapper } from '../../fabric/FabricMapper';


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
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', FabricConfiguration.iconStyle, this.itemType.toLowerCase() + '.svg');
	}

	// tooltip shown when hovering over the item
	protected getToolTip(definition: any) {
		if(!definition) return undefined;

		let tooltip: string = "";
		for (const [key, value] of Object.entries(definition)) {
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
		return this._itemId;
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
		];
		if(this.canOpenInBrowser) {
			actions.push("OPEN_IN_BROWSER");
		}
		if(this.canDelete) {
			actions.push("DELETE");
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

	get itemId() {
		return this._itemId;
	}

	get parent(): FabricApiTreeItem {
		return this._parent;
	}

	set parent(value: FabricApiTreeItem) {
		this._parent = value;
	}

	get TreeProvider(): TreeProviderId {
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

	public copyPropertiesToClipboard(): void {
		vscode.env.clipboard.writeText(JSON.stringify(this.itemDefinition, null, 4));
	}

	public getBrowserLink(): vscode.Uri {
		//https://app.powerbi.com/groups/ccce57d1-10af-1234-1234-665f8bbd8458/datasets/7cdff921-9999-8888-b0c8-34be20567742

		return vscode.Uri.joinPath(vscode.Uri.parse(FabricApiService.BrowserBaseUrl), FabricMapper.mapForBrowserUrl(this.itemPath));
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

		let urlParts: string[] = [];

		let apiItem: FabricApiTreeItem = this;

		while (apiItem) {
			if (apiItem.apiUrlPart) {
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
}