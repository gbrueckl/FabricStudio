import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

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

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricItemConnection(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "data connections");
			}

			return children;
		}
	}

	get apiPath(): string {
		return Helper.joinPath(this.parent.itemApiPath, this.apiUrlPart);
	}
}