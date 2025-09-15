import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiWarehouse } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWarehouse } from './FabricWarehouse';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouses extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/Warehouses`, "Warehouses", "Warehouses", parent, "Warehouses");

		this.id = parent.itemId + "/" + this.itemType.toString();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWarehouse[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiWarehouse>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricWarehouse(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load Warehouses for workspace " + this.workspace.itemName, true);
			}

			return children;
		}
	}
}