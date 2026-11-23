import * as vscode from 'vscode';

import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricFSUri } from './FabricFSUri';
import { FabricApiService } from '../../fabric/FabricApiService';



export class FabricFSRoot extends FabricFSCacheItem {
	constructor(uri: FabricFSUri) {
		super(uri);
	}

	get parent(): FabricFSRoot {
		return undefined;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		this._stats = {
			type: vscode.FileType.Directory,
			ctime: undefined,
			mtime: undefined,
			size: undefined
		};
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			const response = await FabricApiService.listWorkspaces();
			if (response.error) {
				// the children are not marked as loaded so it is retried next time
				throw vscode.FileSystemError.Unavailable(`Could not load workspaces: ${response.error.message}`);
			}
			this._apiResponse = response.success;
			const children: [string, vscode.FileType][] = [];
			for (let apiItem of this._apiResponse) {
				FabricFSUri.addWorkspaceNameIdMap(apiItem.itemName, apiItem.id);
				children.push([apiItem.itemName, vscode.FileType.Directory]);
			}
			this._children = children;
		}
	}
}