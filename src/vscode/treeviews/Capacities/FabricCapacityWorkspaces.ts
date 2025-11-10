import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiCapacity, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { FabricCapacityGenericFolder } from './FabricCapacityGenericFolder';
import { FabricCapacitiesTreeProvider } from './FabricCapacitiesTreeProvider';
import { FabricCapacityWorkspace } from './FabricCapacityWorkspace';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricCapacityWorkspaces extends FabricCapacityGenericFolder {
	constructor(
		parent: FabricCapacityTreeItem
	) {
		super(
			`${parent.id}/workspaces`, 
			"CapacityWorkspaces", 
			"CapacityWorkspaces", 
			parent);

		this.id = parent.itemId + "/" + this.itemType;
	}

	get CapacityId(): string {
		return this.parent.itemId;
	}

	get itemDefinition(): iFabricApiCapacity {
		return this.parent.itemDefinition;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricCapacityTreeItem): Promise<FabricCapacityTreeItem[]> {
		this._children = [];
		const workspaces = FabricCapacitiesTreeProvider.getCapacityworkspaces(this.CapacityId);

		for (let workspace of workspaces) {
			const treeItem = new FabricCapacityWorkspace(workspace, this);
			this._children.push(treeItem);
		}
		return this._children;
	}
}