import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItemConnection, iFabricApiItemShortcut } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItemShortcut } from './FabricItemShortcut';
import { FabricItemConnection } from './FabricItemConnection';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemConnections extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/Connections`, "Connections", "ItemConnections", parent, "connections");
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
				const items = await FabricApiService.getList<iFabricApiItemConnection>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricItemConnection(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load connections for item " + this.parent.itemName);
			}

			return children;
		}
	}

	get apiPath(): string {
		return this.parent.itemApiPath + "/" + this.apiUrlPart
	}
}