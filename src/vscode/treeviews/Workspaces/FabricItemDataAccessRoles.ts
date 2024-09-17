import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItemDataAccessRole } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItem } from './FabricItem';
import { FabricItemDataAccessRole } from './FabricItemDataAccessRole';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDataAccessRoles extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/DataAccessRoles`, "Data Access Roles", "ItemDataAccessRoles", parent, "dataAccessRoles");
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
				const items = await FabricApiService.getList<iFabricApiItemDataAccessRole>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricItemDataAccessRole(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load data access roles for item " + this.parent.itemName);
			}

			return children;
		}
	}

	get apiPath(): string {
		return this.parent.itemApiPath + "/" + this.apiUrlPart
	}
}