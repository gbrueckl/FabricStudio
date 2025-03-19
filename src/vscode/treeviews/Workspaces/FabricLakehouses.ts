import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiItemType, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouses extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/Lakehouses`, "Lakehouses", "Lakehouses", parent, "Lakehouses");

		this.id = parent.itemId + "/" + this.itemType.toString();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricLakehouse[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricLakehouse(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load lakehouses for workspace " + this.workspace.itemName);
			}

			return children;
		}
	}
}