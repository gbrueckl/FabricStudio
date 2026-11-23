import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricFSUri } from './FabricFSUri';
import { FabricFSCache } from './FabricFSCache';
import { FabricCommandBuilder, NO_QP_ITEMS_ITEM_ID } from '../input/FabricCommandBuilder';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';
import { FabricApiItemType, iFabricApiItem, iFabricPlatformFile } from '../../fabric/_types';
import { FabricMapper } from '../../fabric/FabricMapper';
import { FabricQuickPickItem } from '../input/FabricQuickPickItem';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { FabricGUIDHoverProvider } from '../hoverProvider/FabricGUIDHoverProvider';

const NEW_ITEM_ID = "__NEW_ITEM";
// AIDEV-NOTE: Fabric Git uses the empty GUID as workspaceId for references to items in the same workspace (referenced by their logicalId).
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const GUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export abstract class FabricFSHelper {
	private static async getRegex(itemType: FabricApiItemType): Promise<RegExp> {
		const itemTypePlural = FabricMapper.getItemTypePlural(itemType);

		if (!itemTypePlural) {
			throw new Error(`Could not find plural for item type '${itemType}'!`);
		}

		return new RegExp(`((.*\.${itemType})|(.*\/${itemTypePlural}\/[^\/]*))(\/|$)`, "gmi");
	}

	private static async getItemTypeFromUri(uri: vscode.Uri): Promise<FabricApiItemType> {
		if (uri.scheme == FABRIC_SCHEME) {
			const fabricUri = await FabricFSUri.getInstance(uri, false);
			return FabricMapper.getItemTypeSingular(fabricUri.itemType);
		}
		else {
			const rx = /\.([^\/\s]*)/gmi;

			const matches = uri.toString().matchAll(rx);

			let itemType: FabricApiItemType = undefined;
			for (const match of matches) {
				// we check if its a valid item type and if the Definition API is available/configured
				const plural = FabricMapper.getItemTypePlural(match[1]);
				const tempItemType = FabricConfiguration.itemTypeFromString(plural); // checks if the item type also supports definitions
				if (tempItemType) {
					itemType = match[1] as FabricApiItemType; // no break or return, we use the last valid item type found
				}
			}
			if (itemType) {
				return itemType;
			}
		}
		return undefined;
	}

	static async getDefinitionRoot(uri: vscode.Uri, rootFolderRegEx: RegExp): Promise<vscode.Uri> {
		const match = rootFolderRegEx.exec(uri.toString());

		if (match) {
			return vscode.Uri.parse(match[1])
		}

		return undefined;
	}

	static async ensureParents(fabricUri: FabricFSUri, skipLastN: number = 0): Promise<void> {
		const parts = fabricUri.uri.path.split("/").filter((part) => part.length > 0);

		for (let i = 0; i < parts.length - skipLastN; i++) {
			const parentUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}://${Helper.joinPath(...parts.slice(0, i + 1))}`));
			let item = FabricFSCache.getCacheItem(parentUri);
			if (!item) {
				item = await FabricFSCache.addCacheItem(parentUri);
				await item.loadStatsFromApi();
				await item.loadChildrenFromApi();
			}
		}
	}

	private static async getTargetFromQuickPick(
		itemType: FabricApiItemType,
		includeNewOption: boolean = true,
		promptPart: string = "to publish",
		platformContent: iFabricPlatformFile = undefined
	): Promise<FabricQuickPickItem> {
		/*
			1. check item-type quickpick + NEW option
				1.1. if non exist - SKIP to 2.
				1.2. if NEW is selected - SKIP to 3.
				1.3. if existing item is selected - return it
			2. check workspace quickpick
				2.1. if non exist - populate from API with filter
				2.2. rever to 1.
		*/
		if (platformContent) {
			itemType = platformContent.metadata.type;
		}

		let qpItems = FabricCommandBuilder.getQuickPickItems(itemType, false);
		let workspaces = FabricCommandBuilder.getQuickPickItems("Workspace", false);
		let targetWorkspace: FabricQuickPickItem = undefined;

		// if nothing has been loaded yet
		if (qpItems.length == 0 || qpItems[0].value == NO_QP_ITEMS_ITEM_ID) {
			// populate the workspaces QuickPick 
			const dummyRoot = await ThisExtension.TreeViewWorkspaces.getChildren();
			workspaces = FabricCommandBuilder.getQuickPickItems("Workspace");

			targetWorkspace = await FabricCommandBuilder.showQuickPick(workspaces, `Select a workspace ${promptPart} to`, "", "");

			if (!targetWorkspace || targetWorkspace.value == NO_QP_ITEMS_ITEM_ID) {
				ThisExtension.Logger.logError("No workspace selected, aborting publish operation.", true);
				return undefined;
			}

			const itemTypePlural = FabricMapper.getItemTypePlural(itemType);
			const items = await FabricApiService.getList<iFabricApiItem>("/workspaces/" + targetWorkspace.workspaceId + "/" + itemTypePlural);

			for (const item of items.success) {
				let newItem = new FabricQuickPickItem(item.displayName, item.id, item.displayName, item.description);
				newItem.itemType = itemType;
				newItem.workspaceId = targetWorkspace.workspaceId;
				newItem.workspaceName = targetWorkspace.workspaceName;
				FabricCommandBuilder.pushQuickPickItem(newItem)
			}

			qpItems = FabricCommandBuilder.getQuickPickItems(itemType, false);
		}

		if (includeNewOption) {
			let newOption: FabricQuickPickItem = new FabricQuickPickItem(`NEW ${itemType}`, NEW_ITEM_ID, `Create a NEW ${itemType}`, "╠════════════ NEW ════════════╣");
			newOption.alwaysShow = true;
			newOption.iconPath = Helper.getIconPath(itemType);
			newOption.itemType = itemType;

			qpItems = [newOption].concat(qpItems);
		}

		let msg = `Select existing ${itemType} ${promptPart} to`
		if (includeNewOption) { msg = msg + ` or 'New ${itemType}'`; }
		const targetItem = await FabricCommandBuilder.showQuickPick(qpItems, msg, "", "");

		if (!targetItem || targetItem.value == NO_QP_ITEMS_ITEM_ID) {
			ThisExtension.Logger.logError("No item selected, aborting publish operation.", true);
			return undefined;
		}
		else if (includeNewOption && targetItem.value == NEW_ITEM_ID) {
			if (!targetWorkspace) {
				targetWorkspace = await FabricCommandBuilder.showQuickPick(workspaces, `Select target workspace for the new ${itemType}`, "", "");
			}
			if (!targetWorkspace) {
				ThisExtension.Logger.logError("No target workspace selected, aborting publish operation.", true);
				return undefined;
			}
			const newItemName = await vscode.window.showInputBox({
				title: `Publish new ${itemType}`,
				ignoreFocusOut: true,
				prompt: `Enter name for new ${itemType}`,
				placeHolder: `My New ${itemType}`,
				value: platformContent?.metadata?.displayName || `My New ${itemType}`
			});
			if (!newItemName) {
				ThisExtension.Logger.logError("No name for new item selected, aborting publish operation.", true);
				return undefined;
			}
			let newItem = new FabricQuickPickItem(newItemName, NEW_ITEM_ID);
			newItem.workspaceId = targetWorkspace.value;
			newItem.workspaceName = targetWorkspace.label;
			newItem.iconPath = Helper.getIconPath(itemType);
			newItem.itemType = itemType;

			return newItem;
		}
		else {
			// a real item has been selected already
			return targetItem;
		}
	}

	static async getTarget(platformContent: iFabricPlatformFile): Promise<FabricFSUri> {
		const itemType = platformContent.metadata.type;
		const target = await this.getTargetFromQuickPick(itemType, true, undefined, platformContent);


		if(target.value != NEW_ITEM_ID) {
			FabricFSUri.addItemNameIdMap(target.label, target.value, target.workspaceId, itemType);
		}
		const itemTypePlural = FabricMapper.getItemTypePlural(itemType);
		let uri = await FabricFSUri.getInstance(vscode.Uri.parse(`${FABRIC_SCHEME}://${Helper.joinPath("workspaces", target.workspaceId, itemTypePlural, target.label)}`), true);
		
		return uri;
	}

	static async updateReportConnection(targetUri: FabricFSUri): Promise<boolean> {
		const pbirUri = targetUri.uri.with({ path: targetUri.uri.path + "/definition.pbir" });
		const pbirContent = await vscode.workspace.fs.readFile(pbirUri);
		let pbirObj = JSON.parse(Buffer.from(pbirContent).toString("utf8"));

		// if a local reference is used, we need to change it to a connection reference
		if (pbirObj["datasetReference"]["byPath"]) {
			const targetDataset = await FabricFSHelper.getTargetFromQuickPick("SemanticModel", false, "to connect the report");

			if (!targetDataset) {
				ThisExtension.Logger.logError("No target dataset selected, aborting publish operation.", true);
				return false;
			}
			ThisExtension.Logger.logInfo(`Uploading report connection to dataset ${targetDataset.workspaceId}/${targetDataset.label} (${targetDataset.value})`);

			pbirObj["datasetReference"] = {
				"byConnection": {
					"connectionString": null,
					"pbiServiceModelId": null,
					"pbiModelVirtualServerName": "sobe_wowvirtualserver",
					"pbiModelDatabaseName": targetDataset.value,
					"name": "EntityDataSource",
					"connectionType": "pbiServiceXmlaStyleLive"
				}
			};
		}
		else {
			ThisExtension.Logger.logInfo("Uploading report with existing live-connection!");
		}

		await vscode.workspace.fs.writeFile(pbirUri, Buffer.from(JSON.stringify(pbirObj), "utf8"));

		return true;
	}

	static async publishItemFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		const itemType = await this.getItemTypeFromUri(sourceUri);
		if (!itemType) {
			ThisExtension.Logger.logError(`Could not determine item type from URI '${sourceUri.toString()}'!`, true);
			return;
		}

		const PUBLISH_CONFIG = {
			"Report": {
				"itemsToExclude": ["definition.pbir"],
				"prePublishActionCreate": FabricFSHelper.updateReportConnection
			}
		};

		const config = PUBLISH_CONFIG[itemType];

		return Helper.awaitWithProgress<FabricFSUri>(
			`Publishing ${itemType} to Fabric`,
			this.publishFromUri(sourceUri, itemType, config?.itemsToExclude || [], config?.prePublishActionCreate, config?.prePublishActionUpdate),
			3000
		);
	}


	static async publishFromUri(
		sourceUri: vscode.Uri,
		itemType: FabricApiItemType,
		itemsToExclue: string[] = [],
		prePublishActionCreate: (targetUri: FabricFSUri) => Promise<boolean> = undefined,
		prePublishActionUpdate: (targetUri: FabricFSUri) => Promise<boolean> = undefined
	): Promise<FabricFSUri> {
		const rootRegex = await this.getRegex(itemType);
		const sourceFsUri: vscode.Uri = await FabricFSHelper.getDefinitionRoot(sourceUri, rootRegex);

		if (!sourceFsUri) {
			ThisExtension.Logger.logError(`Could not find matching regex '${rootRegex}' in '${sourceUri.toString()}'!`, true);
			return;
		}

		let displayName: string = sourceFsUri.path.split("/").reverse()[0].split(".")[0];
		try {
			const platformFileUri = vscode.Uri.joinPath(sourceFsUri, ".platform");
			let platformFile = Buffer.from(await vscode.workspace.fs.readFile(platformFileUri)).toString("utf8");
			const platformContent: iFabricPlatformFile = JSON.parse(platformFile) as iFabricPlatformFile;

			itemType = platformContent["metadata"]["type"] || itemType;
			displayName = platformContent["metadata"]["displayName"] || displayName;
		}
		catch (error) { }

		const target = await this.getTarget({ "metadata": { "type": itemType, "displayName": displayName } });
		if (!target) {
			ThisExtension.Logger.logError("No target selected, aborting publish operation.", true);
			return;
		}

		if (sourceUri.toString() == target.uri.toString()) {
			await FabricFSCache.publishToFabric(sourceUri, true);
			return target;
		}
		else {
			return this.publishContent(sourceFsUri, target, itemsToExclue, target.itemId == undefined, prePublishActionCreate, prePublishActionUpdate);
		}
	}

	/**
	 * Returns a function that resolves a logicalId to the ID of the corresponding item in the target workspace.
	 * Each fallback is only used if the previous one could not resolve the logicalId:
	 * 1. logicalIds of the items in the target workspace (if connected to Git)
	 * 2. item type and name from the GUID cache of the hover provider
	 * 3. GUID cache of the hover provider after loading the local .platform files (only once per session)
	 */
	private static async getLogicalIdResolver(workspaceId: string): Promise<(logicalId: string) => Promise<string>> {
		const response = await FabricApiService.listItems(workspaceId);

		if (response.error) {
			ThisExtension.Logger.logError(`Could not list items of workspace '${workspaceId}' to resolve logicalIds: ${response.error.message}`);
			return async () => undefined;
		}

		const typeAndNameKey = (itemType: string, displayName: string) => `${itemType}/${displayName}`.toLowerCase();
		const itemIdByLogicalId = new Map<string, string>();
		const itemIdByTypeAndName = new Map<string, string>();
		for (const item of response.success || []) {
			if (item.logicalId && item.id && item.logicalId != EMPTY_GUID) {
				itemIdByLogicalId.set(item.logicalId.toLowerCase(), item.id);
			}
			itemIdByTypeAndName.set(typeAndNameKey(item.type, item.displayName), item.id);
		}
		ThisExtension.Logger.logInfo(`Found ${itemIdByLogicalId.size} item(s) with a logicalId in target workspace '${workspaceId}'.`);

		const getItemIdFromCache = (logicalId: string): string => {
			const cachedItem = FabricGUIDHoverProvider.getFabricObjectNameByGUID(logicalId);
			// skip cache entries of actual item IDs (itemId == GUID) - only entries cached for a logicalId are relevant
			if (cachedItem?.itemType && cachedItem?.itemName && (cachedItem.workspaceId == EMPTY_GUID || cachedItem.itemId?.toLowerCase() != logicalId.toLowerCase())) {
				return itemIdByTypeAndName.get(typeAndNameKey(cachedItem.itemType, cachedItem.itemName));
			}
			return undefined;
		};

		return async (logicalId: string) => {
			// 1. logicalIds of the target workspace
			let itemId = itemIdByLogicalId.get(logicalId.toLowerCase());
			if (itemId) {
				return itemId;
			}

			// 2. GUID cache of the hover provider
			itemId = getItemIdFromCache(logicalId);
			if (itemId) {
				return itemId;
			}

			// 3. load local .platform files into the GUID cache (only once per session) and try again
			await FabricGUIDHoverProvider.loadLocalPlatformFiles(false);
			itemId = getItemIdFromCache(logicalId);
			if (itemId) {
				return itemId;
			}

			return undefined;
		};
	}

	/**
	 * Definitions from a local Fabric Git repository reference items of the same workspace via the empty GUID
	 * as workspaceId and the logicalId of the referenced item. If a copied file contains the empty GUID, it is
	 * replaced with the target workspace ID and all logicalIds of items in the target workspace are replaced
	 * with their actual item IDs in the target copy.
	 * The local source files are not modified.
	 * @returns `false` if a file contains the empty GUID but no logicalId could be replaced, `true` otherwise.
	 */
	static async resolveLogicalIdReferences(
		sourceUri: vscode.Uri,
		fabricUri: FabricFSUri,
		itemsToExclue: string[] = [],
		isCreate: boolean = false
	): Promise<boolean> {
		let resolveLogicalId: (logicalId: string) => Promise<string> = undefined;
		// resolved itemIds (or undefined if not resolvable) of all GUIDs found so far - shared across all files
		const itemIdByGuid = new Map<string, string>();

		const processFolder = async (relativePath: string[]): Promise<boolean> => {
			for (const [name, fileType] of await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(sourceUri, ...relativePath))) {
				// same filter as used when copying the definition (only applied on the root level)
				if (relativePath.length == 0 && !isCreate && (name.startsWith(".") || itemsToExclue.includes(name))) {
					continue;
				}

				const itemPath = [...relativePath, name];
				if (fileType & vscode.FileType.Directory) {
					if (!await processFolder(itemPath)) {
						return false;
					}
					continue;
				}
				if (!(fileType & vscode.FileType.File)) {
					continue;
				}

				const content = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(sourceUri, ...itemPath))).toString("utf8");
				if (!content.includes(EMPTY_GUID)) {
					continue;
				}

				if (!resolveLogicalId) {
					ThisExtension.Logger.logInfo(`Found references to the current workspace (${EMPTY_GUID}) - resolving logicalIds in target workspace '${fabricUri.workspaceId}' ...`);
					resolveLogicalId = await this.getLogicalIdResolver(fabricUri.workspaceId);
				}

				// only GUIDs found in the file are looked up
				for (const match of content.matchAll(GUID_REGEX)) {
					const guid = match[0].toLowerCase();
					if (guid != EMPTY_GUID && !itemIdByGuid.has(guid)) {
						itemIdByGuid.set(guid, await resolveLogicalId(guid));
					}
				}

				let workspaceReplacements = 0;
				let logicalIdReplacements = 0;
				const newContent = content.replace(GUID_REGEX, (guid) => {
					if (guid == EMPTY_GUID) {
						workspaceReplacements++;
						return fabricUri.workspaceId;
					}
					const itemId = itemIdByGuid.get(guid.toLowerCase());
					if (itemId) {
						logicalIdReplacements++;
						return itemId;
					}
					return guid;
				});

				if (logicalIdReplacements == 0) {
					ThisExtension.Logger.logError(`'${itemPath.join("/")}' references the current workspace (${EMPTY_GUID}) but no logicalId could be resolved to an item in target workspace '${fabricUri.workspaceId}'!`, true);
					return false;
				}

				await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(fabricUri.uri, ...itemPath), Buffer.from(newContent, "utf8"));
				ThisExtension.Logger.logInfo(`Replaced ${workspaceReplacements} workspace reference(s) and ${logicalIdReplacements} logicalId(s) in '${itemPath.join("/")}'.`);
			}

			return true;
		};

		return await processFolder([]);
	}

	static async publishContent(
		sourceUri: vscode.Uri,
		fabricUri: FabricFSUri,
		itemsToExclue: string[] = [],
		isCreate: boolean = false,
		prePublishActionCreate: (targetUri: FabricFSUri) => Promise<boolean> = undefined,
		prePublishActionUpdate: (targetUri: FabricFSUri) => Promise<boolean> = undefined
	): Promise<FabricFSUri> {

		ThisExtension.Logger.logInfo("Publishing from: " + sourceUri.toString());
		ThisExtension.Logger.logInfo("To Fabric target: " + fabricUri.uri.toString());

		if (isCreate) {
			await this.ensureParents(fabricUri, 1);
			await vscode.workspace.fs.createDirectory(fabricUri.uri);
		}
		else {
			await this.ensureParents(fabricUri);
			// delete current definition from Target - everything except files starting with . (like .platform)
			for (const item of await FabricFSCache.getCacheItem(fabricUri).readDirectory()) {
				if (!item[0].startsWith(".") && !itemsToExclue.includes(item[0])) {
					await vscode.workspace.fs.delete(vscode.Uri.joinPath(fabricUri.uri, item[0]), { recursive: true, useTrash: false });
				}
			}
		}
		//await vscode.workspace.fs.delete(fabricUri.uri, { recursive: true, useTrash: false });
		// copy new definition from source
		for (const item of await vscode.workspace.fs.readDirectory(sourceUri)) {
			// for create we need to copy everything
			if (isCreate || (!item[0].startsWith(".") && !itemsToExclue.includes(item[0]))) {
				await vscode.workspace.fs.copy(
					vscode.Uri.joinPath(sourceUri, item[0]),
					vscode.Uri.joinPath(fabricUri.uri, item[0]),
					{ overwrite: true }
				);
			}
		}

		if (!await this.resolveLogicalIdReferences(sourceUri, fabricUri, itemsToExclue, isCreate)) {
			ThisExtension.Logger.logError("Resolving logicalIds aborted the publish operation.");
			return;
		}

		if (isCreate) {
			// mark target as created
			await FabricFSCache.localItemAdded(fabricUri);
			if (prePublishActionCreate) {
				const continuePublish = await prePublishActionCreate(fabricUri);
				if (!continuePublish) {
					ThisExtension.Logger.logError("Pre-publish action after Create aborted the publish operation.");
					return;
				}
			}

			FabricCommandBuilder.pushQuickPickItem(fabricUri.asQuickPickItem);
		}
		else {
			// mark target as modified
			await FabricFSCache.localItemModified(fabricUri);
			if (prePublishActionUpdate) {
				const continuePublish = await prePublishActionUpdate(fabricUri);
				if (!continuePublish) {
					ThisExtension.Logger.logError("Pre-publish action after Update aborted the publish operation.");
					return;
				}
			}
		}

		await FabricFSCache.publishToFabric(fabricUri.uri);

		return fabricUri;
	}
}
