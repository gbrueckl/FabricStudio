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
import { FabricApiItemType, iFabricApiItemPart } from '../../fabric/_types';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';

export abstract class FabricFSCache {
	private static _localChanges: Map<string, FabricFSPublishAction> = new Map<string, FabricFSPublishAction>();
	private static _cache: Map<string, FabricFSCacheItem> = new Map<string, FabricFSCacheItem>();

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
			return (item as FabricFSItem).getContentForSubpath(fabricUri.part);
		}

		ThisExtension.Logger.logError(`readFile() - Could not read File: ${fabricUri.uri.toString()}`, true);
		throw vscode.FileSystemError.Unavailable("Could not read File: " + fabricUri.uri.toString());
	}

	public static async writeFile(fabricUri: FabricFSUri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			item = await FabricFSCache.addCacheItem(fabricUri);
			FabricFSCache.localItemAdded(item.FabricUri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			const newFileAdded = await (item as FabricFSItem).writeContentToSubpath(fabricUri.part, content, options);

			if (item.publishAction != FabricFSPublishAction.CREATE) {
				FabricFSCache.localItemModified(item.FabricUri);
				item.publishAction = FabricFSPublishAction.MODIFIED;
			}

			return;
		}

		// individual files can only be written below an item as parts
		const msg = `Individual files can only be written below an item: ${fabricUri.uri.toString()}`;
		ThisExtension.Logger.logError(msg, true);
		throw vscode.FileSystemError.Unavailable("Could not write File: " + fabricUri.uri.toString());
	}

	public static async delete(fabricUri: FabricFSUri): Promise<void> {
		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			throw vscode.FileSystemError.FileNotFound(fabricUri.uri);
		}

		if (fabricUri.uriType == FabricUriType.part) {
			(item as FabricFSItem).removePart(fabricUri.part);
			// if a part is deleted, we mark the item as modified
			FabricFSCache.localItemModified(fabricUri.fabricItemUri);
			return;
		}
		else if (fabricUri.uriType == FabricUriType.item) {
			(item as FabricFSItem).delete();
			FabricFSCache.localItemDeleted(fabricUri);

			vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", Helper.parentUri(fabricUri.uri));

			return;
		}

		ThisExtension.Logger.logError(`delete() - Could not delete File/Folder: ${fabricUri.uri.toString()}`, true);
		throw vscode.FileSystemError.Unavailable("Could not delete File: " + fabricUri.uri.toString());
	}

	public static async rename(oldFabricUri: FabricFSUri, newFabricUri: FabricFSUri): Promise<void> {
		let oldItem = FabricFSCache.getCacheItem(oldFabricUri);
		if (!oldItem) {
			throw vscode.FileSystemError.FileNotFound(oldFabricUri.uri);
		}
		const fileOrFolder = (await FabricFSCache.stats(oldFabricUri)).type;

		let newItem = FabricFSCache.getCacheItem(newFabricUri);
		if (!newItem) {
			newItem = await FabricFSCache.addCacheItem(newFabricUri);
		}

		if (oldFabricUri.uriType == FabricUriType.part && newFabricUri.uriType == FabricUriType.part) {
			let folderParts: iFabricApiItemPart[] = [];
			if (fileOrFolder == vscode.FileType.Directory) {
				// check if the target folder already exists
				folderParts = await (oldItem as FabricFSItem).getPartsFromFolder(oldFabricUri.part);
			}
			else if (fileOrFolder == vscode.FileType.File) {
				folderParts = [await (oldItem as FabricFSItem).getPart(oldFabricUri.part)];
			}
			else {
				ThisExtension.Logger.logError("rename() - Could not rename File: " + oldFabricUri.uri.toString(), true);
			}

			for (let oldPart of folderParts) {
				const newPartPath = oldPart.path.replace(oldFabricUri.part, newFabricUri.part)
				// check if the target file already exists
				const newPart = await (newItem as FabricFSItem).getPart(newPartPath);
				if (newPart) {
					throw vscode.FileSystemError.FileExists(newFabricUri.uri);
				}

				//let oldPart = await (oldItem as FabricFSItem).getPart(oldPart.path);
				(oldItem as FabricFSItem).removePart(oldPart.path);

				(newItem as FabricFSItem).addPart(newPartPath, oldPart.payload, oldPart.payloadType);
			}

			FabricFSCache.localItemModified(oldItem.FabricUri);
			FabricFSCache.localItemModified(newItem.FabricUri);

			return;
		}
		else if (oldFabricUri.uriType == FabricUriType.item && newFabricUri.uriType == FabricUriType.item) {
			// update parent child list
			(oldItem as FabricFSItem).parent.removeChild(decodeURIComponent(oldFabricUri.item));
			(newItem as FabricFSItem).parent.addChild(decodeURIComponent(newFabricUri.item), vscode.FileType.Directory);

			FabricFSUri.addItemNameIdMap(newFabricUri.itemMapName, oldFabricUri.itemId);

			(oldItem as FabricFSItem).displayName = decodeURIComponent(newFabricUri.item);
			FabricFSCache.addCacheItem(newFabricUri, oldItem)

			if (oldItem.FabricUri == newItem.FabricUri) {
				FabricFSCache.localItemModified(newFabricUri);
			}
			else {
				FabricFSCache.localItemAdded(newFabricUri);
				FabricFSCache.localItemDeleted(oldFabricUri);
			}

			return;
		}

		ThisExtension.Logger.logError(`rename() - Could not rename File: ${oldFabricUri.uri.toString()} to ${newFabricUri.uri.toString()}`, true);
		throw vscode.FileSystemError.Unavailable("Could not rename File: " + oldFabricUri.uri.toString());
	}

	public static async createDirectory(fabricUri: FabricFSUri): Promise<void> {
		let item = FabricFSCache.getCacheItem(fabricUri);
		if (!item) {
			if (fabricUri.uriType == FabricUriType.item) {
				let itemType = FabricFSCache.getCacheItem((await fabricUri.getParent())) as FabricFSItemType;

				await itemType.createItem(decodeURIComponent(fabricUri.item));
				FabricFSCache.localItemAdded(fabricUri);

				return;
			}
			else if (fabricUri.uriType == FabricUriType.workspace) {

			}
			else if (fabricUri.uriType == FabricUriType.itemType) {
				const newFolderName = fabricUri.uri.path.split("/").pop();

				const newItemType: FabricApiItemType = newFolderName.split(".").pop() as FabricApiItemType;

				if (!FabricConfiguration.itemTypeHasDefinition(newItemType)) {
					(item as FabricFSItem).createSubFolder(newItemType);
				}

				return;
			}
		}
		if (item) {
			if (fabricUri.uriType == FabricUriType.part) {
				(item as FabricFSItem).createSubFolder(fabricUri.part);

				return;
			}
		}

		ThisExtension.Logger.logError(`createDirectory() - Could not create Directory: ${fabricUri.uri.toString()}`, true);
		throw vscode.FileSystemError.NoPermissions("Could not create Directory: " + fabricUri.uri.toString());
	}


	public static async reloadFromFabric(resourceUri: vscode.Uri, refreshExplorer: boolean = true): Promise<void> {
		const fabricUri: FabricFSUri = await FabricFSUri.getInstance(resourceUri);

		for (let key of FabricFSCache._cache.keys()) {
			if (key.startsWith(fabricUri.cacheItemKey)) {
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
			if (key.startsWith(fabricUri.uniqueKey)) {
				return true;
			}
		}
		return false;
	}

	public static async publishToFabric(resourceUri: vscode.Uri, refreshExplorer: boolean = true): Promise<void> {
		const fabricUri: FabricFSUri = await FabricFSUri.getInstance(resourceUri);

		ThisExtension.Logger.logInfo("Publishing changes to Fabric ...");

		for (let [key, action] of FabricFSCache._localChanges.entries()) {
			if (key.startsWith(fabricUri.uniqueKey)) {
				const itemToPublish = FabricFSCache.getCacheItem(await FabricFSUri.getInstance(vscode.Uri.parse(key))) as FabricFSItem;
				if (!itemToPublish?.displayName) // when publishing from Workspace Browser
				{
					itemToPublish.displayName = fabricUri.item;
				}
				const response = await itemToPublish.publish();

				if (response.error) {
					vscode.window.showErrorMessage(response.error.message);
				}
				else {
					FabricFSCache.localItemPublished(itemToPublish.FabricUri);

					if (refreshExplorer) {
						vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer", fabricUri.uri);
					}
				}
			}
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
	public static localItemAdded(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.CREATE);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static localItemModified(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.MODIFIED);

		FabricFSFileDecorationProvider.updateFileDecoration([fabricUri.uri]);
	}

	public static localItemDeleted(fabricUri: FabricFSUri): void {
		FabricFSCache._localChanges.set(fabricUri.uniqueKey, FabricFSPublishAction.DELETE);

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

		for (let [key, action] of FabricFSCache._localChanges.entries()) {
			if (key.startsWith(fabricUri.uniqueKey)) {
				FabricFSCache._localChanges.delete(key)
				reloadedUris.push(vscode.Uri.parse(key));
			}
		}

		FabricFSFileDecorationProvider.updateFileDecoration(reloadedUris);
	}

	public static getLocalChanges(fabricUri: FabricFSUri): FabricFSPublishAction {
		return FabricFSCache._localChanges.get(fabricUri.uniqueKey);
	}
	//#endregion
}
