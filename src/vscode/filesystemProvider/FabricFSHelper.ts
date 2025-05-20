import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricFSUri } from './FabricFSUri';
import { FabricFSCache } from './FabricFSCache';
import { FabricCommandBuilder } from '../input/FabricCommandBuilder';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';
import { FabricApiItemType, iFabricApiItem } from '../../fabric/_types';
import { FabricMapper } from '../../fabric/FabricMapper';
import { FabricQuickPickItem } from '../input/FabricQuickPickItem';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricConfiguration } from '../configuration/FabricConfiguration';

const NEW_ITEM_ID = "__NEW_ITEM";

export abstract class FabricFSHelper {
	private static async getRegex(itemType: FabricApiItemType): Promise<RegExp> {
		const itemTypePlural = FabricMapper.getItemTypePlural(itemType);

		if (!itemTypePlural) {
			throw new Error(`Could not find plural for item type '${itemType}'!`);
		}

		return new RegExp(`((.*\.${itemType})|(.*\/${itemTypePlural}))(\/|$)`, "gmi");
	}

	private static async getItemTypeFromUri(uri: vscode.Uri): Promise<FabricApiItemType> {
		if (uri.scheme == FABRIC_SCHEME) {
			const fabricUri = await FabricFSUri.getInstance(uri, false);
			return fabricUri.itemType;
		}
		else {
			const rx = /\.([^\/\s]*)/gmi;

			const matches = uri.toString().matchAll(rx);

			for (const match of matches) {
				// we check if its a valid item type and if the Definition API is available/configured
				const plural = FabricMapper.getItemTypePlural(match[1]);
				const itemType = FabricConfiguration.itemTypeFromString(plural); // checks if the item type also supports definitions
				if (itemType) {
					return match[1] as FabricApiItemType;
				}
			}
		}
		return undefined;
	}

	static async getDefinitionRoot(uri: vscode.Uri, rootFolderRegEx: RegExp): Promise<vscode.Uri> {

		const match = rootFolderRegEx.exec(uri.toString());

		if (match) {
			return vscode.Uri.parse(match[1])
		}

		const parts = uri.toString().split("/")

		// return parent of rootFolderName
		// if (parts.includes(rootFolderName)) {
		// 	const definitionUri = Helper.trimChar(Helper.joinPath(...parts.slice(undefined, parts.indexOf(rootFolderName))), "/");
		// 	return vscode.Uri.parse(definitionUri);
		// }

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

	private static async getTargetFromQuickPick(itemType: FabricApiItemType, includeNewOption: boolean = true, promptPart: string = "to overwrite"): Promise<FabricQuickPickItem> {
		/*
			1. check item-type quickpick + NEW option
				1.1. if non exist - SKIP to 2.
				1.2. if NEW is selected - SKIP to 3.
				1.3. if existing item is selected - return it
			2. check workspace quickpick
				2.1. if non exist - populate from API with filter
				2.2. rever to 1.
		*/

		let qpItems = FabricCommandBuilder.getQuickPickItems(itemType, false);
		let workspaces = FabricCommandBuilder.getQuickPickItems("Workspace", false);

		// if nothing has been loaded yet
		if (qpItems.length == 0 || qpItems[0].value == "NO_ITEMS_FOUND") {
			// populate the workspaces QuickPic 
			const dummyRoot = await ThisExtension.TreeViewWorkspaces.getChildren();
			workspaces = FabricCommandBuilder.getQuickPickItems("Workspace");
			qpItems = workspaces;
		}

		if (includeNewOption) {
			let newOption: FabricQuickPickItem = new FabricQuickPickItem(`New ${itemType}`, NEW_ITEM_ID, `Create a new ${itemType}`, "----------------------------------");
			newOption.alwaysShow = true;
			qpItems = [newOption].concat(qpItems);
		}

		let msg = `Select existing ${itemType} ${promptPart}`
		if (includeNewOption) { msg = msg + ` or 'New ${itemType}'`; }
		const targetItem = await FabricCommandBuilder.showQuickPick(qpItems, msg, "", "");

		if (!targetItem) {
			ThisExtension.Logger.logError("No item selected, aborting publish operation.", true);
			return undefined;
		}
		else if (targetItem.value != NEW_ITEM_ID && targetItem.itemType != "Workspace") {
			// a real item has been selected already
			return targetItem;
		}
		else if (includeNewOption && targetItem.value == NEW_ITEM_ID) {
			const targetWorkspace = await FabricCommandBuilder.showQuickPick(workspaces, `Select target workspace for the new ${itemType}`, "", "");
			if (!targetWorkspace) {
				ThisExtension.Logger.logError("No target workspace selected, aborting publish operation.", true);
				return undefined;
			}
			const newItemName = await vscode.window.showInputBox({
				prompt: `Enter name for new ${itemType}`,
				placeHolder: `My New ${itemType}`
			});
			if (!newItemName) {
				ThisExtension.Logger.logError("No name for new item selected, aborting publish operation.", true);
				return undefined;
			}
			let newItem = new FabricQuickPickItem(newItemName);
			newItem.workspaceId = targetWorkspace.value;

			return newItem;
		}

		else {
			const itemTypePlural = FabricMapper.getItemTypePlural(itemType);
			const items = await FabricApiService.getList<iFabricApiItem>("/workspaces/" + targetItem.workspaceId + "/" + itemTypePlural);

			for (const item of items.success) {
				let newItem = new FabricQuickPickItem(item.displayName, item.id, item.displayName, item.description);
				newItem.itemType = itemType;
				newItem.workspaceId = targetItem.workspaceId;
				newItem.detail = `\tWorkspaceID: ${targetItem.workspaceId}`
				FabricCommandBuilder.pushQuickPickItem(newItem)
			}

			return this.getTargetFromQuickPick(itemType, false, promptPart);
		}
	}

	static async getTarget(itemType: FabricApiItemType): Promise<FabricFSUri> {
		const target = await this.getTargetFromQuickPick(itemType, true);

		const itemTypePlural = FabricMapper.getItemTypePlural(itemType);
		return await FabricFSUri.getInstance(vscode.Uri.parse(`${FABRIC_SCHEME}://${Helper.joinPath("workspaces", target.workspaceId, itemTypePlural, target.label)}`), true);

	}


	static async publishSemanticModelFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		return this.publishItemFromLocal(sourceUri);
	}

	static async publishReportFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		return this.publishItemFromLocal(sourceUri);
	}

	static async updateReportConnection(targetUri: FabricFSUri): Promise<boolean> {
		const pbirUri = targetUri.uri.with({ path: targetUri.uri.path + "/definition.pbir" });
		const pbirContent = await vscode.workspace.fs.readFile(pbirUri);
		let pbirObj = JSON.parse(Buffer.from(pbirContent).toString("utf8"));

		// if a local reference is used, we need to change it to a connection reference
		if (pbirObj["datasetReference"]["byPath"]) {
			const targetDataset = await FabricFSHelper.getTargetFromQuickPick("SemanticModel", false, "to connect to");

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
		return this.publishFromUri(sourceUri, itemType, config?.itemsToExclude || [], config?.prePublishActionCreate, config?.prePublishActionUpdate);
	}


	static async publishFromUri(
		sourceUri: vscode.Uri,
		itemType: FabricApiItemType,
		itemsToExclue: string[] = [],
		prePublishActionCreate: (targetUri: FabricFSUri) => Promise<boolean> = undefined,
		prePublishActionUpdate: (targetUri: FabricFSUri) => Promise<boolean> = undefined
	): Promise<FabricFSUri> {
		const rootRegex = await this.getRegex(itemType);
		const target = await this.getTarget(itemType);
		if (!target) {
			ThisExtension.Logger.logError("No target selected, aborting publish operation.", true);
			return;
		}

		const sourceFsUri: vscode.Uri = await FabricFSHelper.getDefinitionRoot(sourceUri, rootRegex);

		if (!sourceFsUri) {
			ThisExtension.Logger.logError(`Could not find matching regex '${rootRegex}' in '${sourceUri.toString()}'!`, true);
			return;
		}

		return this.publishContent(sourceFsUri, target, itemsToExclue, target.itemId == undefined, prePublishActionCreate, prePublishActionUpdate);
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

		if (isCreate) {
			// mark target as created
			await FabricFSCache.localItemAdded(fabricUri);
			if (prePublishActionCreate) {
				const continuePublish = await prePublishActionCreate(fabricUri);
				if (!continuePublish) {
					ThisExtension.Logger.logError("Pre-publish action after Create aborted the publish operation.", true);
					return;
				}
			}
		}
		else {
			// mark target as modified
			await FabricFSCache.localItemModified(fabricUri);
			if (prePublishActionUpdate) {
				const continuePublish = await prePublishActionUpdate(fabricUri);
				if (!continuePublish) {
					ThisExtension.Logger.logError("Pre-publish action after Update aborted the publish operation.", true);
					return;
				}
			}
		}

		await FabricFSCache.publishToFabric(fabricUri.uri);

		return fabricUri;
	}
}
