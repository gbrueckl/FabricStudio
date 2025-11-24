import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricReport } from './FabricReport';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricReports extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(
			`${parent.itemId}/Reports`, 
			"Reports", 
			"Reports", 
			parent, 
			"Reports");

		this.id = parent.itemId + "/" + this.itemType;

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricReport[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricReport(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "reports");
			}

			return children;
		}
	}
}