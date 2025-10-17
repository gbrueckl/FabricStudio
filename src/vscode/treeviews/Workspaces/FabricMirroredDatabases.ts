import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricMirroredDatabase } from './FabricMirroredDatabase';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricMirroredDatabases extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(
			`${parent.itemId}/MirroredDatabases`, 
			"MirroredDatabases", 
			"MirroredDatabases", 
			parent, 
			"MirroredDatabases");

		this.id = parent.itemId + "/" + this.itemType;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricMirroredDatabase[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricMirroredDatabase(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load pipelines for workspace " + this.workspace.itemName, true);
			}

			return children;
		}
	}
}