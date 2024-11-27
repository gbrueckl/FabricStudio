import * as vscode from 'vscode';

import { FabricApiItemType, iFabricApiItem, iFabricApiWorkspace } from '../../fabric/_types';
import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricFSUri } from './FabricFSUri';
import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricFSRoot } from './FabricFSRoot';
import { TYPES_WITH_DEFINITION } from '../configuration/FabricConfiguration';
import { FabricMapper } from '../../fabric/FabricMapper';

export class FabricFSWorkspace extends FabricFSCacheItem implements iFabricApiWorkspace {
	id: string;
	displayName: string;
	description: string;
	type: string;
	capacityId: string;
	capacityAssignmentProgress: string;

	constructor(uri: FabricFSUri) {
		super(uri);
	}

	get parent(): FabricFSRoot {
		return super.parent as FabricFSRoot;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		const response = await FabricApiService.getWorkspace(this.FabricUri.workspaceId);

		if (response.success) {
			const apiItem = response.success;
			if (apiItem) {
				this.id = apiItem.id;
				this.displayName = apiItem.displayName;
				this.description = apiItem.description;
				this.type = apiItem.type;
				this.capacityId = apiItem.capacityId;
				this.capacityAssignmentProgress = apiItem.capacityAssignmentProgress;

				this._stats = {
					type: vscode.FileType.Directory,
					ctime: undefined,
					mtime: undefined,
					size: undefined
				};
			}
		}
		else {
			this._stats = undefined;
		}
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			const response = await FabricApiService.getList<iFabricApiItem>(`/v1/workspaces/${this.FabricUri.workspaceId}/items`);
			this._apiResponse = response.success;
			this._children = [];
			for (let item of this._apiResponse) {
				const itemTypePlural = FabricMapper.getItemTypePlural(item.type);
				if (!this._children.find((x) => x[0] == itemTypePlural) && TYPES_WITH_DEFINITION.includes(itemTypePlural)) {
					this._children.push([itemTypePlural, vscode.FileType.Directory]);
				}
			}
		}
	}
}