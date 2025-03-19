import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricDataPipeline } from './FabricDataPipeline';
import { FabricEnvironment } from './FabricEnvironment';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricEnvironments extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(
			`${parent.itemId}/Environments`, 
			"Environments", 
			"Environments", 
			parent, 
			"Environments");

		this.id = parent.itemId + "/" + this.itemType;

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricEnvironment[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricEnvironment(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load environments for workspace " + this.workspace.itemName);
			}

			return children;
		}
	}
}