import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';
import { FabricApiItemType, iFabricApiItem } from '../../fabric/_types';
import { ThisExtension } from '../../ThisExtension';
import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricFSWorkspace } from './FabricFSWorkspace';
import { FabricFSItemType } from './FabricFSItemType';
import { FabricFSItem } from './FabricFSItem';
import { FabricFSRoot } from './FabricFSRoot';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricFSCache } from './FabricFSCache';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { FabricMapper } from '../../fabric/FabricMapper';
import { FabricQuickPickItem } from '../input/FabricQuickPickItem';

// regex with a very basic check for valid GUIDs
const REGEX_FABRIC_URI = /fabric:\/\/workspaces\/(?<workspace>[0-9a-fA-F-]{36})?(\/(?<itemType>[a-zA-Z]*))?(\/(?<Item>[0-9a-fA-F-]{36}))?(\/(?<part>.*))?($|\?)/gm

export enum FabricUriType {
	root = 1,
	workspace = 2,
	itemType = 3,
	item = 4,
	part = 5
}

export class FabricFSUri {
	private static _workspaceNameIdMap: Map<string, string> = new Map<string, string>();
	private static _itemNameIdMap: Map<string, string> = new Map<string, string>();


	uri: vscode.Uri;
	workspace?: string;
	itemType?: FabricApiItemType;
	item?: string;
	part: string;
	uriType: FabricUriType;

	/*
	fabric://workspaces/<workspace-id>/<itemType>/<item-id>/<partFolder/partfolder/partFile>
	*/
	constructor(uri: vscode.Uri) {
		this.uri = uri;

		let uriString = uri.toString();

		if (uriString.startsWith(FABRIC_SCHEME + ":/")) {
			// works with fabric:/ and fabric:// and fabric:///
			let paths = uriString.split("/").filter((path) => path.length > 0).slice(1);
			if (paths[0] != 'workspaces') {
				ThisExtension.Logger.logInfo(`Fabric URI '${uri.toString()}' does not match pattern ${REGEX_FABRIC_URI}!`);
			}
			this.workspace = paths[1];
			this.itemType = FabricConfiguration.itemTypeFromString(paths[2]);
			this.item = paths[3];
			this.part = paths.slice(4).join("/");

			if (paths.length >= 5) {
				this.uriType = FabricUriType.part;
			}
			else {
				this.uriType = paths.length;
			}

			return
		}

		ThisExtension.Logger.logInfo(`Fabric URI '${uri.toString()}' does not match pattern ${REGEX_FABRIC_URI}!`);

		throw vscode.FileSystemError.Unavailable("Invalid Fabric URI: " + uri.toString());
	}

	static async getInstance(uri: vscode.Uri, skipValidation: boolean = false): Promise<FabricFSUri> {
		const fabricUri = new FabricFSUri(uri);

		if (!fabricUri.isValid && !skipValidation) {
			ThisExtension.Logger.logDebug(`Fabric URI '${uri.toString()}' is not valid!`);
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return fabricUri;
	}

	static getInstanceFromApiDefinition(definition: iFabricApiItem): FabricFSUri {
		if (definition.type == "Workspace") {
			FabricFSUri.addWorkspaceNameIdMap(definition.displayName, definition.id);
			return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///workspaces/${definition.id}`));
		}

		if (definition.type == "WorkspaceFolder") {
			return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///workspaces/${definition.workspaceId}`));
		}

		// we need to encode twice otherwise the encoded URL is not persisted correctly in the settings
		const itemName = encodeURIComponent(encodeURIComponent(definition.displayName));
		const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(definition.type);
		let itemFsPath = Helper.trimChar(Helper.joinPath("workspaces", definition.workspaceId, itemTypePlural, itemName), "/");

		// TODO: there is a bug if the item resides in a workspace folder
		FabricFSUri.addItemNameIdMap(definition.displayName, definition.id, definition.workspaceId, definition.type);
		const fabricFsUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///${itemFsPath}`));

		return fabricFsUri;
	}

	static async openInBrowser(uri: vscode.Uri): Promise<void> {
		const fabricUri = new FabricFSUri(uri);

		const baseUrl = vscode.Uri.joinPath(vscode.Uri.parse(FabricApiService.BrowserBaseUrl), "groups", fabricUri.workspaceId, fabricUri.itemTypeBrowserLink, fabricUri.itemId).toString();

		const tenantParam = FabricApiService.TenantId ? `?ctid=${FabricApiService.TenantId}` : "";
		const fullLink = `${baseUrl}${tenantParam}`;

		Helper.openLink(fullLink);
	}

	private get itemTypeBrowserLink(): string {
		const plural = FabricMapper.getItemTypePlural(this.itemType).toLowerCase();
		const browserItemType = FabricMapper.mapForBrowserUrl(plural);
		return browserItemType
	}

	get isValid(): boolean {
		if (this.uriType >= FabricUriType.itemType && !this.itemType) {
			return false;
		}

		if (FabricFSCache.hasCacheItem(this)) {
			return true;
		}

		// VSCode always checks for files in the root of the URI
		// as we can only have workspace IDs (GUIDs) or names from our NameIdMap, we can throw a FileNotFound error for all other files in the root
		if (this.workspace && !Helper.isGuid(this.workspace) && !FabricFSUri._workspaceNameIdMap.has(this.workspaceMapName)) {
			return false;
		}
		if (this.item && !Helper.isGuid(this.item) && !FabricFSUri._itemNameIdMap.has(this.itemMapName) && !FabricFSCache.getLocalChanges(this)) {
			return false;
		}

		return true;
	}

	get uniqueKey(): string {
		return this.uri.toString().replace("//", "/");
	}

	get workspaceId(): string {
		if (Helper.isGuid(this.workspace)) return this.workspace;

		ThisExtension.Logger.logDebug("Trying to get ID for workspace '" + this.workspaceMapName + "' ...");
		return FabricFSUri._workspaceNameIdMap.get(this.workspaceMapName);
	}

	private get workspaceMapName(): string {
		return this.workspace;
	}

	public get itemMapName(): string {
		return FabricFSUri.getItemMapName(this.workspaceId, this.itemType, this.item);
	}

	public static getItemMapName(workspaceId: string, itemType: FabricApiItemType, itemName: string): string {
		return decodeURIComponent(`${workspaceId}/${itemType}/${itemName}`);
	}

	// the final map contains encoded names to handle special characters
	public static addWorkspaceNameIdMap(workspaceName: string, workspaceId: string): void {
		// encode the workspace name to handle special characters
		FabricFSUri._workspaceNameIdMap.set(encodeURIComponent(workspaceName), workspaceId);
	}

	// the final map contains encoded names to handle special characters
	public static addItemNameIdMap(itemName: string, itemId: string, workspaceId: string = undefined, itemType: FabricApiItemType = undefined): void {
		// itemName is the original name, we have to encode it
		if (workspaceId && itemType) {
			const itemTypePlural = FabricMapper.getItemTypePlural(itemType);
			itemName = FabricFSUri.getItemMapName(workspaceId, itemTypePlural, encodeURIComponent(itemName));
		}

		FabricFSUri._itemNameIdMap.set(itemName, itemId);
	}

	get itemId(): string {
		if (Helper.isGuid(this.item)) return this.item;

		ThisExtension.Logger.logDebug("Trying to get ID for item '" + this.itemMapName + "' ...");
		return FabricFSUri._itemNameIdMap.get(this.itemMapName);
	}

	async getParent(): Promise<FabricFSUri> {
		return await FabricFSUri.getInstance(Helper.parentUri(this.uri));
	}




	private constructor_regex(uri: vscode.Uri) {
		let match: RegExpExecArray;

		this.uri = uri;

		match = REGEX_FABRIC_URI.exec(Helper.trimChar(uri.toString(), "/"));

		if (match) {
			this.workspace = match.groups["workspace"];
			this.itemType = FabricConfiguration.itemTypeFromString(match.groups["itemType"]);
			this.item = match.groups["item"];
			this.part = match.groups["part"];

			return
		}

		ThisExtension.Logger.logInfo(`Fabric URI '${uri.toString()}' does not match pattern ${REGEX_FABRIC_URI}!`);

		throw vscode.FileSystemError.Unavailable("Invalid Fabric URI: " + uri.toString());
	}

	get uriTypeCalc(): FabricUriType {
		if (!this.workspace) {
			return FabricUriType.root;
		}
		else if (this.workspace && !this.itemType) {
			return FabricUriType.workspace;
		}
		else if (this.itemType && !this.item) {
			return FabricUriType.itemType;
		}
		else if (this.item && !this.part) {
			return FabricUriType.item;
		}
		else if (this.part) {
			return FabricUriType.part;
		}
		else {
			throw vscode.FileSystemError.Unavailable("Invalid Fabric URI!" + this.uri.toString());
		}
	}

	async getCacheItem<T = FabricFSCacheItem>(): Promise<T> {
		switch (this.uriType) {
			case FabricUriType.root:
				return new FabricFSRoot(this) as T;
			case FabricUriType.workspace:
				return new FabricFSWorkspace(this) as T;
			case FabricUriType.itemType:
				return new FabricFSItemType(this) as T;
			case FabricUriType.item:
				return new FabricFSItem(this) as T;
			case FabricUriType.part:
				return new FabricFSItem(this.fabricItemUri) as T;
		}
	}

	getCacheItemSync<T = FabricFSCacheItem>(): T {
		switch (this.uriType) {
			case FabricUriType.root:
				return new FabricFSRoot(this) as T;
			case FabricUriType.workspace:
				return new FabricFSWorkspace(this) as T;
			case FabricUriType.itemType:
				return new FabricFSItemType(this) as T;
			case FabricUriType.item:
				return new FabricFSItem(this) as T;
			case FabricUriType.part:
				return new FabricFSItem(this.fabricItemUri) as T;
		}
	}

	get cacheItemKey(): string {
		if (this.uriType == FabricUriType.part) {
			return this.fabricItemUri.cacheItemKey;
		}
		return this.uri.toString().replace("//", "/");
	}

	get fabricItemUri(): FabricFSUri {
		// fabric://workspaces/<workspace-id>/<itemType>/<item-id>/<part1/part2/part3> to fabric://workspaces/<workspace-id>/<itemType>/<item-id>
		let uri = vscode.Uri.parse(this.uri.toString().split("/").filter((path) => path.length > 0).slice(undefined, 5).join("/"));
		return new FabricFSUri(uri);
	}

	get asQuickPickItem(): FabricQuickPickItem {
		const itemUrl = this.fabricItemUri;

		const singular = FabricMapper.getItemTypeSingular(itemUrl.itemType);
		let qpItem = new FabricQuickPickItem(itemUrl.item, itemUrl.itemId, singular);
		qpItem.itemType = singular;
		qpItem.workspaceId = this.workspaceId;
		for (const [key, value] of FabricFSUri._workspaceNameIdMap) {
			if (value == itemUrl.workspaceId) {
				qpItem.workspaceName = key;
				break;
			}
		}

		return qpItem;
	}
}