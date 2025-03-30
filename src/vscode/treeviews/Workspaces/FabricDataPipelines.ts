import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricDataPipeline } from './FabricDataPipeline';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricDataPipelines extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(
			`${parent.itemId}/dataPipelines`, 
			"DataPipelines", 
			"DataPipelines", 
			parent, 
			"DataPipelines");

		this.id = parent.itemId + "/" + this.itemType;

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"EDIT_DEFINITION"
		];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricDataPipeline[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricDataPipeline(item, this);
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