import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { iFabricApiRecoverableItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricRecoverableItem } from './FabricRecoverableItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceRecoverableItems extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/recoverableItems`, "Recoverable Items", "RecoverableItems", parent, "recoverableItems", vscode.TreeItemCollapsibleState.Expanded);

		this.iconPath = new vscode.ThemeIcon('trash');
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricWorkspaceTreeItem[] = [];

		if (this._children) {
			children = this._children;
			this._children = undefined;
			return children;
		}

		try {
			// AIDEV-NOTE: Recoverable items are workspace-scoped and exposed under /recoverableItems.
			const items = await FabricApiService.getList<iFabricApiRecoverableItem>(this.apiPath, undefined, undefined, undefined);

			if (items.error) {
				return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
			}

			for (let item of items.success || []) {
				children.push(new FabricRecoverableItem(item, this));
			}

			Helper.sortArrayByProperty(children, "label");
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.workspace, "recoverable items");
		}

		return children;
	}
}
