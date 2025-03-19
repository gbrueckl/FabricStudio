import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricNotebook } from './FabricNotebook';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricNotebooks extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/Notebooks`, "Notebooks", "Notebooks", parent, "Notebooks");

		this.id = parent.itemId + "/" + this.itemType.toString();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricNotebook[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricNotebook(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load notebooks for workspace " + this.workspace.itemName);
			}

			return children;
		}
	}
}