import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItem } from './FabricItem';
import { FabricAppliedTag } from './FabricAppliedTag';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemTags extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/tags`, "Tags", "ItemTags", parent, undefined, vscode.TreeItemCollapsibleState.Expanded);

		this.iconPath = new vscode.ThemeIcon('tag');
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	get apiPath(): string {
		return this.parent.itemApiPath;
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
			let itemDefinition = this.parent.itemDefinition;

			if (!itemDefinition?.tags) {
				const item = await FabricApiService.get<iFabricApiItem>(this.apiPath);

				if (item.error) {
					ThisExtension.Logger.logError(item.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(item.error)];
				}

				itemDefinition = item.success;
				this.parent.itemDefinition = itemDefinition;
			}

			for (let tag of itemDefinition.tags || []) {
				children.push(new FabricAppliedTag(tag, "ItemTag", this));
			}

			Helper.sortArrayByProperty(children, "label");
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "item tags");
		}

		return children;
	}
}