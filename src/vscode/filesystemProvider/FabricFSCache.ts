import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';

import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricFSUri, FabricUriType } from './FabricFSUri';
import { FabricFSItem } from './FabricFSItem';
import { FabricFSFileDecorationProvider } from '../fileDecoration/FabricFileDecorationProvider';
import { FabricFSPublishAction } from './_types';
import { FabricFSItemType } from './FabricFSItemType';
import { Helper } from '@utils/Helper';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { iFabricApiItem, iFabricApiItemPart } from '../../fabric/_types';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';

export abstract class FabricFSCache {
	private static _localChanges: Map<string, FabricFSPublishAction> = new Map<string, FabricFSPublishAction>();
	// incremented with every local change - used to detect changes that were made while a publish was in progress
	private static _localChangeVersions: Map<string, number> = new Map<string, number>();
	// publish operations that are currently in progress - only one publish per item at a time
	private static _publishInProgress: Map<string, Promise<void>> = new Map<string, Promise<void>>();
	private static _cache: Map<string, FabricFSCacheItem> = new Map<string, FabricFSCacheItem>();

	// checks if a key is the given key or a child of it - "Notebooks/Sales" must not match "Notebooks/Sales2"
	private static isSameOrChildKey(key: string, parentKey: string): boolean {
		const parent = parentKey.endsWith("/") ? parentKey : parentKey + "/";
		return key == parentKey || key.startsWith(parent);
	}

	public static async initialize(): Promise<void> {
		if (FabricFSCache._cache) {
			FabricFSCache._cache.clear();
		}
		else {
			FabricFSCache._cache = new Map<string, FabricFSCacheItem>();
		}
	}

	public static async stats(fabricUri: FabricFSUri): Promise<vscode.FileStat | undefined> {
		if (!fabricUri.isValid) {
			ThisExtension.Logger.logInfo(`stats() - Fabric URI is not valid: ${fabricUri.uri.toString()}`);
			throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
		}

		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			item = await FabricFSCache.addCacheItem(fabricUri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			await (item as FabricFSItem).ensureDefinitionLoaded();
			return (item as FabricFSItem).getStatsForSubpath(fabricUri.part);
		}
		const stats = await item.stats();

		if (!stats) {
			ThisExtension.Logger.logInfo(`stats() - Fabric URI is not found: ${fabricUri.uri.toString()}`);
			throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
		}

		return stats;
	}

	public static async readDirectory(fabricUri: FabricFSUri): Promise<[string, vscode.FileType][] | undefined> {
		if (!fabricUri.isValid) {
			ThisExtension.Logger.logInfo(`readDirectory() - Fabric URI is not valid: ${fabricUri.uri.toString()}`);
			throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
		}

		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			item = await FabricFSCache.addCacheItem(fabricUri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			await (item as FabricFSItem).ensureDefinitionLoaded();
			return (item as FabricFSItem).getChildrenForSubpath(fabricUri.part);
		}

		const items = item.readDirectory();

		return items;
	}

	public static async readFile(fabricUri: FabricFSUri): Promise<Uint8Array> {
		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			item = await FabricFSCache.addCacheItem(fabricUri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			await (item as FabricFSItem).ensureDefinitionLoaded();
			return (item as FabricFSItem).getContentForSubpath(fabricUri.part);
		}

		// only parts below an item are files - VSCode and other extensions probe for files (e.g. .mcp.json) without checking their existence first, so we must not show an error message to the user!
		ThisExtension.Logger.logDebug(`readFile() - Could not read File: ${fabricUri.uri.toString()}`);
		throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
	}

	public static async writeFile(fabricUri: FabricFSUri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		if (fabricUri.uriType == FabricUriType.part) {
			let item = FabricFSCache.getCacheItem(fabricUri);
			if (!item) {
				// an existing item that was not loaded yet (e.g. restored editor) - its definition is loaded below
				item = await FabricFSCache.addCacheItem(fabricUri);
			}
			await (item as FabricFSItem).ensureDefinitionLoaded();

			if (item.publishAction == FabricFSPublishAction.DELETE) {
				throw vscode.FileSystemError.NoPermissions(`The item '${item.FabricUri.uri.toString()}' is marked for deletion!`);
			}

			await (item as FabricFSItem).writeContentToSubpath(fabricUri.part, content, options);

			if (item.publishAction == FabricFSPublishAction.CREATE) {
				// still a new item - but the change has to be tracked in case a publish is in progress
				FabricFSCache.localItemAdded(item.FabricUri);
			}
			else {
				FabricFSCache.localItemModified(item.FabricUri);
				item.publishAction = FabricFSPublishAction.MODIFIED;
			}

			return;
		}

		// individual files can only be written below an item as parts - VSCode already shows the thrown error to the user
		const msg = `Individual files can only be written below an item: ${fabricUri.uri.toString()}`;
		ThisExtension.Logger.logError(msg);
		throw vscode.FileSystemError.NoPermissions(msg);
	}

	public static async delete(fabricUri: FabricFSUri): Promise<void> {
		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			const fabricItem = item as FabricFSItem;
			await fabricItem.ensureDefinitionLoaded();
			// throws FileNotFound if the file/folder does not exist
			fabricItem.getStatsForSubpath(fabricUri.part);

			await fabricItem.removePart(decodeURIComponent(fabricUri.part));
			// if a part is deleted, we mark the item as modified
			if (fabricItem.publishAction == FabricFSPublishAction.CREATE) {
				FabricFSCache.localItemAdded(fabricUri.fabricItemUri);
			}
			else {
				FabricFSCache.localItemModified(fabricUri.fabricItemUri);
			}
			return;
		}
		else if (fabricUri.uriType == FabricUriType.item) {
			const wasCreatedLocally = item.publishAction == FabricFSPublishAction.CREATE;
			await (item as FabricFSItem).delete();
			if (wasCreatedLocally) {
				// the item only existed locally - nothing to publish
				FabricFSCache.restoreLocalChange(fabricUri, undefined);
			}
			else {
				FabricFSCache.localItemDeleted(fabricUri);
			}

			vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", Helper.parentUri(fabricUri.uri));

			return;
		}

		// VSCode already shows the thrown error to the user
		ThisExtension.Logger.logError(`delete() - Could not delete File/Folder: ${fabricUri.uri.toString()}`);
		throw vscode.FileSystemError.NoPermissions("Only items and files/folders within items can be deleted: " + fabricUri.uri.toString());
	}

	public static async rename(oldFabricUri: FabricFSUri, newFabricUri: FabricFSUri, overwrite: boolean = false): Promise<void> {
		let oldItem = FabricFSCache.getCacheItem(oldFabricUri);
		if (!oldItem) {
			throw vscode.FileSystemError.FileNotFound(oldFabricUri.uri);
		}
		const fileOrFolder = (await FabricFSCache.stats(oldFabricUri)).type;

		if (oldFabricUri.uriType == FabricUriType.part && newFabricUri.uriType == FabricUriType.part) {
			const oldFabricItem = oldItem as FabricFSItem;
			await oldFabricItem.ensureDefinitionLoaded();

			// the target can be a different item (e.g. moving a file between items) - it has to exist already
			let newItem = FabricFSCache.getCacheItem(newFabricUri);
			if (!newItem) {
				newItem = await FabricFSCache.addCacheItem(newFabricUri);
			}
			const newFabricItem = newItem as FabricFSItem;
			await newFabricItem.ensureDefinitionLoaded();

			// all paths are compared decoded - the URI parts are encoded
			const oldPrefix = decodeURIComponent(oldFabricUri.part);
			const newPrefix = decodeURIComponent(newFabricUri.part);

			let partsToMove: iFabricApiItemPart[] = [];
			if (fileOrFolder == vscode.FileType.Directory) {
				partsToMove = await oldFabricItem.getPartsFromFolder(oldPrefix);
			}
			else if (fileOrFolder == vscode.FileType.File) {
				partsToMove = [await oldFabricItem.getPart(oldPrefix)];
			}
			partsToMove = partsToMove.filter((part) => part);

			const moves = partsToMove.map((oldPart) => ({ oldPart: oldPart, newPath: newPrefix + oldPart.path.substring(oldPrefix.length) }));

			// check all targets before changing anything so a rename is never only partially applied
			for (const move of moves) {
				const existingPart = await newFabricItem.getPart(move.newPath);
				if (existingPart && !overwrite) {
					throw vscode.FileSystemError.FileExists(newFabricUri.uri);
				}
			}

			for (const move of moves) {
				if (overwrite && await newFabricItem.getPart(move.newPath)) {
					await newFabricItem.removePart(move.newPath);
				}
				await oldFabricItem.removePart(move.oldPart.path);
				await newFabricItem.addPart(move.newPath, move.oldPart.payload, move.oldPart.payloadType);
			}

			for (const fabricItem of [oldFabricItem, newFabricItem]) {
				if (fabricItem.publishAction == FabricFSPublishAction.CREATE) {
					FabricFSCache.localItemAdded(fabricItem.FabricUri);
				}
				else {
					FabricFSCache.localItemModified(fabricItem.FabricUri);
				}
			}

			return;
		}
		else if (oldFabricUri.uriType == FabricUriType.item && newFabricUri.uriType == FabricUriType.item) {
			const oldFabricItem = oldItem as FabricFSItem;
			const oldName = decodeURIComponent(oldFabricUri.item);
			const newName = decodeURIComponent(newFabricUri.item);

			// items can only be renamed within the same item type folder
			const parentUri = await oldFabricUri.getParent();
			if ((await newFabricUri.getParent()).cacheItemKey != parentUri.cacheItemKey) {
				throw vscode.FileSystemError.NoPermissions("Items can only be renamed within the same folder!");
			}
			const parentChildren = await FabricFSCache.readDirectory(parentUri);
			if (oldName.toLowerCase() != newName.toLowerCase() && parentChildren.some((child) => child[0].toLowerCase() == newName.toLowerCase())) {
				// replacing an existing item is not supported - even with overwrite
				throw vscode.FileSystemError.FileExists(newFabricUri.uri);
			}
			const parent = FabricFSCache.getCacheItem(parentUri);

			const wasCreatedLocally = oldFabricItem.publishAction == FabricFSPublishAction.CREATE;
			const itemId = oldFabricUri.itemId;

			// the definition has to be loaded before the name changes as it is loaded by the item name
			if (!wasCreatedLocally) {
				await oldFabricItem.ensureDefinitionLoaded();
			}

			// update parent child list
			parent.removeChild(oldName);
			parent.addChild(newName, vscode.FileType.Directory);

			// move the cache item and the name/ID mapping to the new name
			FabricFSCache.removeCacheItem(oldFabricItem);
			FabricFSUri.removeItemNameIdMap(oldName, oldFabricUri.workspaceId, oldFabricUri.itemType);
			if (itemId) {
				FabricFSUri.addItemNameIdMap(newName, itemId, newFabricUri.workspaceId, newFabricUri.itemType);
			}
			oldFabricItem.moveTo(newFabricUri);
			oldFabricItem.displayName = newName;
			await oldFabricItem.renameDefinitionFile(oldName, newName);
			await FabricFSCache.addCacheItem(newFabricUri, oldFabricItem);

			// a rename is published as an update of the existing item (or still as create if it was never published)
			FabricFSCache.restoreLocalChange(oldFabricUri, undefined);
			if (wasCreatedLocally) {
				FabricFSCache.localItemAdded(newFabricUri);
			}
			else {
				oldFabricItem.publishAction = FabricFSPublishAction.MODIFIED;
				FabricFSCache.localItemModified(newFabricUri);
			}

			return;
		}

		// VSCode already shows the thrown error to the user
		ThisExtension.Logger.logError(`rename() - Could not rename File: ${oldFabricUri.uri.toString()} to ${newFabricUri.uri.toString()}`);
		throw vscode.FileSystemError.NoPermissions("Only items and files/folders within items can be renamed: " + oldFabricUri.uri.toString());
	}

	public static async createDirectory(fabricUri: FabricFSUri): Promise<void> {
		// a cache item for the item type might already exist (e.g. from a previous stat() call) - so this is handled independent of the cache
		if (fabricUri.uriType == FabricUriType.itemType && fabricUri.itemType && !fabricUri.itemType.startsWith(".")) {
			// make sure the children of the workspace are loaded so the new folder is not lost when they are loaded later
			const workspaceUri = await fabricUri.getParent();
			const workspaceChildren = await FabricFSCache.readDirectory(workspaceUri);
			const workspace = FabricFSCache.getCacheItem(workspaceUri);

			const newFolderName = decodeURIComponent(fabricUri.uri.path.split("/").pop());
			if (workspaceChildren.find((child) => child[0].toLowerCase() == newFolderName.toLowerCase())) {
				throw vscode.FileSystemError.FileExists(fabricUri.uri);
			}

			// check if the folder name is a valid item type by listing all items of this type in the workspace
			const response = await FabricApiService.getList<iFabricApiItem>(`/v1/workspaces/${fabricUri.workspaceId}/${fabricUri.itemType}`);
			if (response.error) {
				// no popup here - VSCode already shows the thrown error to the user
				const msg = `'${newFolderName}' is not a valid Fabric item type: ${response.error.message}`;
				ThisExtension.Logger.logError(`createDirectory() - ${msg}`);
				throw vscode.FileSystemError.NoPermissions(msg);
			}

			// replace any existing cache item (e.g. from a previous stat() call that did not find the folder)
			const newItemType = await FabricFSCache.addCacheItem(fabricUri) as FabricFSItemType;
			if (response.success.length == 0) {
				// the new item type does not have any items yet - no need to load them from the API again
				newItemType.initializeEmpty([]);
			}
			workspace.addChild(newFolderName, vscode.FileType.Directory);

			return;
		}

		if (fabricUri.uriType == FabricUriType.item) {
			const itemTypeUri = await fabricUri.getParent();
			// make sure the item type and its children are loaded
			await FabricFSCache.readDirectory(itemTypeUri);
			const itemType = FabricFSCache.getCacheItem(itemTypeUri) as FabricFSItemType;

			// throws FileExists if an item with the same name already exists
			await itemType.createItem(decodeURIComponent(fabricUri.item));
			FabricFSCache.localItemAdded(fabricUri);

			return;
		}
		else if (fabricUri.uriType == FabricUriType.part) {
			let item = FabricFSCache.getCacheItem(fabricUri);
			if (!item) {
				item = await FabricFSCache.addCacheItem(fabricUri);
			}
			const fabricItem = item as FabricFSItem;
			await fabricItem.ensureDefinitionLoaded();

			// throws FileExists if a file or folder with the same name already exists
			await fabricItem.createSubFolder(decodeURIComponent(fabricUri.part));

			return;
		}

		// VSCode already shows the thrown error to the user
		ThisExtension.Logger.logError(`createDirectory() - Could not create Directory: ${fabricUri.uri.toString()}`);
		throw vscode.FileSystemError.NoPermissions("Could not create Directory: " + fabricUri.uri.toString());
	}


	public static async reloadFromFabric(resourceUri: vscode.Uri, refreshExplorer: boolean = true): Promise<void> {
		const fabricUri: FabricFSUri = await FabricFSUri.getInstance(resourceUri);

		for (let key of Array.from(FabricFSCache._cache.keys())) {
			if (FabricFSCache.isSameOrChildKey(key, fabricUri.cacheItemKey)) {
				FabricFSCache._cache.delete(key);
			}
		}

		FabricFSCache.localItemReloaded(fabricUri);

		if (refreshExplorer) {
			vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", resourceUri);
		}
	}

	public static unpublishedChanges(resourceUri: vscode.Uri): boolean {
		const fabricUri: FabricFSUri = new FabricFSUri(resourceUri);

		for (let key of FabricFSCache._localChanges.keys()) {
			if (FabricFSCache.isSameOrChildKey(key, fabricUri.uniqueKey)) {
				return true;
			}
		}
		return false;
	}

	public static async publishToFabric(resourceUri: vscode.Uri, refreshExplorer: boolean = true): Promise<void> {
		const fabricUri: FabricFSUri = await FabricFSUri.getInstance(resourceUri);

		ThisExtension.Logger.logInfo("Publishing changes to Fabric ...");

		// take a snapshot of the keys as the local changes are modified while publishing
		const keysToPublish = Array.from(FabricFSCache._localChanges.keys()).filter((key) => FabricFSCache.isSameOrChildKey(key, fabricUri.uniqueKey));

		for (const key of keysToPublish) {
			// only one publish per item at a time - wait for a publish that is already in progress (e.g. quick consecutive saves)
			while (FabricFSCache._publishInProgress.has(key)) {
				await FabricFSCache._publishInProgress.get(key);
			}
			// the changes might have been published by the previous publish already
			if (!FabricFSCache._localChanges.has(key)) {
				continue;
			}

			const publish = FabricFSCache.publishItem(key, fabricUri, refreshExplorer);
			FabricFSCache._publishInProgress.set(key, publish);
			try {
				await publish;
			}
			finally {
				FabricFSCache._publishInProgress.delete(key);
			}
		}
	}

	private static async publishItem(key: string, fabricUri: FabricFSUri, refreshExplorer: boolean): Promise<void> {
		const itemToPublish = FabricFSCache.getCacheItem(await FabricFSUri.getInstance(vscode.Uri.parse(key), true)) as FabricFSItem;
		if (!itemToPublish) {
			ThisExtension.Logger.logError(`Could not publish '${key}' - the item is not loaded anymore!`, true);
			return;
		}
		if (!itemToPublish.displayName) // when publishing from Workspace Browser
		{
			itemToPublish.displayName = decodeURIComponent(itemToPublish.FabricUri.item ?? fabricUri.item);
		}

		const versionBeforePublish = FabricFSCache._localChangeVersions.get(key);
		const response = await itemToPublish.publish();

		if (!response || response.error) {
			vscode.window.showErrorMessage(response?.error?.message ?? `Could not publish '${key}'!`);
			return;
		}

		if (FabricFSCache._localChangeVersions.get(key) != versionBeforePublish) {
			// the item was changed while publishing - keep it marked as modified so the newer changes are not lost
			ThisExtension.Logger.logWarning(`'${key}' was changed while it was published - the latest changes are not published yet!`);
			if (FabricFSCache._localChanges.get(key) == FabricFSPublishAction.CREATE) {
				// the item exists in Fabric now
				FabricFSCache._localChanges.set(key, FabricFSPublishAction.MODIFIED);
			}
		}
		else {
			FabricFSCache.localItemPublished(itemToPublish.FabricUri);
		}

		if (refreshExplorer) {
			vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", fabricUri.uri);
		}
	}

	public static async onDidSave(document: vscode.TextDocument | vscode.NotebookDocument): Promise<void> {
		if (document.uri.scheme != FABRIC_SCHEME) {
			return;
		}
		const fabricUri: FabricFSUri = await FabricFSUri.getInstance(document.uri);
		const publishOnSave = FabricConfiguration.getFabricItemTypePublishOnSave(fabricUri.itemType);

		if (publishOnSave) {
			const item = FabricFSCache.getCacheItem(fabricUri) as FabricFSItem;
			if (!item) {
				return;
			}

			await FabricFSCache.publishToFabric(item.FabricUri.uri);
		}
	}

	public static async addCacheItem(fabricUri: FabricFSUri, cacheItem: FabricFSCacheItem = undefined): Promise<FabricFSCacheItem> {
		if (!cacheItem) {
			cacheItem = await fabricUri.getCacheItem();
		}
		FabricFSCache._cache.set(fabricUri.cacheItemKey, cacheItem);

		return cacheItem;
	}

	public static removeCacheItem(item: FabricFSCacheItem): boolean {
		return FabricFSCache._cache.delete(item.FabricUri.cacheItemKey);
	}

	public static getCacheItem(fabricUri: FabricFSUri): FabricFSCacheItem {
		return FabricFSCache._cache.get(fabricUri.cacheItemKey);
	}

	public static hasCacheItem(item: FabricFSUri): boolean {
		return FabricFSCache._cache.has(item.cacheItemKey);
	}

	//#region Local Changes - for FileDecorationProvider
	private static increaseLocalChangeVersion(fabricUri: FabricFSUri): void {
		const key = fabricUri.uniqueKey;
		FabricFSCache._localChangeVersions.set(key, (FabricFSCache._localChangeVersions.get(key) ?? 0) + 1);
	}

	public static localItemAdded(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.CREATE);
		FabricFSCache.increaseLocalChangeVersion(fabricUri);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static localItemModified(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.MODIFIED);
		FabricFSCache.increaseLocalChangeVersion(fabricUri);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static localItemDeleted(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.DELETE);
		FabricFSCache.increaseLocalChangeVersion(fabricUri);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static localItemPublished(fabricUri: FabricFSUri): boolean {
		let ret: boolean = false;

		ret = FabricFSCache._localChanges.delete(fabricUri.uniqueKey);

		if (ret) {
			FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
		}
		return ret;
	}

	public static localItemReloaded(fabricUri: FabricFSUri): void {
		let reloadedUris: vscode.Uri[] = [];

		for (let key of Array.from(FabricFSCache._localChanges.keys())) {
			if (FabricFSCache.isSameOrChildKey(key, fabricUri.uniqueKey)) {
				FabricFSCache._localChanges.delete(key);
				FabricFSCache._localChangeVersions.delete(key);
				reloadedUris.push(vscode.Uri.parse(key));
			}
		}

		FabricFSFileDecorationProvider.updateFileDecoration(reloadedUris);
	}

	// sets the local change of a single item back to a previous state (e.g. when a publish from a local folder is aborted)
	public static restoreLocalChange(fabricUri: FabricFSUri, action: FabricFSPublishAction | undefined): void {
		if (action) {
			FabricFSCache._localChanges.set(fabricUri.uniqueKey, action);
		}
		else {
			FabricFSCache._localChanges.delete(fabricUri.uniqueKey);
		}
		FabricFSCache.increaseLocalChangeVersion(fabricUri);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static getLocalChanges(fabricUri: FabricFSUri): FabricFSPublishAction {
		return FabricFSCache._localChanges.get(fabricUri.uniqueKey);
	}
	//#endregion
}
