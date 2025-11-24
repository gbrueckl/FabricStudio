import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';
import { FabricWorkspace } from './FabricWorkspace';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlEndpoints extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspace
	) {
		super(
			`${parent.itemId}/SqlEndpoints`, 
			"SqlEndpoints", 
			"SQLEndpoints", 
			parent, 
			"SqlEndpoints");

		this.id = parent.itemId + "/" + this.itemType;

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricSqlEndpoint[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricSqlEndpoint(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "SQL endpoints");
			}

			return children;
		}
	}
}