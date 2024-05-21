import * as vscode from 'vscode';

import { FabricFSUri } from './FabricFSUri';
import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiItemType, FabricApiItemTypeWithDefinition, iFabricApiItem } from '../../fabric/_types';
import { FabricFSPublishAction } from './_types';
import { FabricFSCache } from './FabricFSCache';
import { FabricFSItem } from './FabricFSItem';
import { FabricFSWorkspace } from './FabricFSWorkspace';
import { FabricConfiguration } from '../configuration/FabricConfiguration';

export class FabricFSItemType extends FabricFSCacheItem {
	constructor(uri: FabricFSUri) {
		super(uri);
	}

	get itemType(): FabricApiItemTypeWithDefinition {
		return this.FabricUri.itemType;
	}

	get parent(): FabricFSWorkspace {
		return super.parent as FabricFSWorkspace;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		if (FabricConfiguration.itemTypes.includes(this.itemType)) {
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
			this._apiResponse = response.success;
			this._children = [];
			for (let item of this._apiResponse) {
				FabricFSUri.addItemNameIdMap(`${item.workspaceId}/${this.itemType}/${item.displayName}`, item.id);
				this._children.push([item.displayName, vscode.FileType.Directory]);
			}
		}
	}

	public async createItem(name: string): Promise<void> {
		if (!this._children.includes([name, vscode.FileType.Directory])) {
			this._children.push([name, vscode.FileType.Directory]);

			const fabricUri = await FabricFSUri.getInstance(vscode.Uri.joinPath(this._uri.uri, name), true)
			FabricFSCache.localItemAdded(fabricUri);

			let newItem = await FabricFSCache.addCacheItem(fabricUri) as FabricFSItem;

			newItem.initializeEmpty([]);
			newItem.displayName = name;
			newItem.publishAction = FabricFSPublishAction.CREATE;
		}
	}
}