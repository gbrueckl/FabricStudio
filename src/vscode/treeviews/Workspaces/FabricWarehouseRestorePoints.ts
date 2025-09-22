import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiWarehouseRestorePoint } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWarehouseRestorePoint } from './FabricWarehouseRestorePoint';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouseRestorePoints extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/RestorePoints`, "RestorePoints", "WarehouseRestorePoints", parent, "restorePoints");
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWarehouseRestorePoint[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiWarehouseRestorePoint>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricWarehouseRestorePoint(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError(`Could not load Restore Points for warehouse '${this.itemName}' in '${this.workspace.itemName}`, true);
			}

			Helper.sortArrayByProperty(children, "eventDateTime", "DESC");

			return children;
		}
	}
}