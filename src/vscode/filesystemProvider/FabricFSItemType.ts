import * as vscode from 'vscode';

import { FabricFSUri } from './FabricFSUri';
import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiItemType, iFabricApiItem } from '../../fabric/_types';
import { FabricFSPublishAction } from './_types';
import { FabricFSCache } from './FabricFSCache';
import { FabricFSItem } from './FabricFSItem';
import { FabricFSWorkspace } from './FabricFSWorkspace';
import { FabricConfiguration } from '../configuration/FabricConfiguration';

export class FabricFSItemType extends FabricFSCacheItem {
	constructor(uri: FabricFSUri) {
		super(uri);
	}

	get itemType(): FabricApiItemType {
		return this.FabricUri.itemType;
	}

	get parent(): FabricFSWorkspace {
		return super.parent as FabricFSWorkspace;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		// the folder only exists if the workspace contains items of this type or it was created locally
		// otherwise VSCode assumes the folder already exists when creating it and never calls createDirectory()
		const folderName = decodeURIComponent(this.uri.path.split("/").pop()).toLowerCase();
		const workspaceChildren = await FabricFSCache.readDirectory(await this.FabricUri.getParent());
		const folderExists = workspaceChildren?.some((child) => child[0].toLowerCase() == folderName);

		if (folderExists && FabricConfiguration.itemTypeHasDefinition(this.itemType)) {
			this._stats = {
				type: vscode.FileType.Directory,
				ctime: undefined,
				mtime: undefined,
				size: undefined
			};
		}
		else {
			this._stats = undefined;
		}
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			const response = await FabricApiService.getList<iFabricApiItem>(`/v1/workspaces/${this.FabricUri.workspaceId}/${this.FabricUri.itemType.toString()}`);
			if (response.error) {
				// the children are not marked as loaded so it is retried next time
				throw vscode.FileSystemError.Unavailable(`Could not load items of '${this.FabricUri.uri.toString()}': ${response.error.message}`);
			}
			this._apiResponse = response.success;
			const children: [string, vscode.FileType][] = [];
			for (let item of this._apiResponse) {
				FabricFSUri.addItemNameIdMap(item.displayName, item.id, item.workspaceId, this.itemType);
				children.push([item.displayName, vscode.FileType.Directory]);
			}
			this._children = children;
		}
	}

	public async createItem(name: string): Promise<void> {
		const children = await this.readDirectory();
		const fabricUri = await FabricFSUri.getInstance(vscode.Uri.joinPath(this._uri.uri, name), true);

		if (children.some((child) => child[0].toLowerCase() == name.toLowerCase())) {
			throw vscode.FileSystemError.FileExists(fabricUri.uri);
		}

		this.addChild(name, vscode.FileType.Directory);
		FabricFSCache.localItemAdded(fabricUri);

		let newItem = await FabricFSCache.addCacheItem(fabricUri) as FabricFSItem;

		newItem.initializeEmpty([]);
		newItem.displayName = name;
		newItem.publishAction = FabricFSPublishAction.CREATE;
	}
}