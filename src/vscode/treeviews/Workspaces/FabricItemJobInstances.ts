import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItemJobInstance, iFabricApiItemShortcut } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItem } from './FabricItem';
import { FabricItemJobInstance } from './FabricItemJobInstance';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemJobInstances extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/Jobs`, "Jobs", "ItemJobInstances", parent, "jobs/instances");
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];

			if(this._children) {
				children = this._children;
				this._children = undefined;
				return children;
			}

			try {
				const items = await FabricApiService.getList<iFabricApiItemJobInstance>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricItemJobInstance(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load job instances for item " + this.parent.itemName);
			}

			return children;
		}
	}

	get apiPath(): string {
		return this.parent.itemApiPath + "/" + this.apiUrlPart
	}
}