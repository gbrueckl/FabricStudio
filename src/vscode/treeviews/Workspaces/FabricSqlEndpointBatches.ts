import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';
import { FabricSqlEndpointBatch } from './FabricSqlEndpointBatch';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlEndpointBatches extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricSqlEndpoint
	) {
		super(
			`${parent.id}/Batches`, 
			"Batches", 
			"SQLEndpointBatches", 
			parent, 
			"batches");

		this.id = parent.id + "/" + this.itemType;

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get apiPath(): string {
		return `https://api.powerbi.com/v1.0/myorg/lhdatamarts/${this.parent.itemId}/batches`
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricSqlEndpointBatch[] = [];

			try {
				const items = await FabricApiService.getList<iPowerBiSqlEndpointSyncBatch>(this.apiPath);

				for (let item of items.success) {
					let treeItem = new FabricSqlEndpointBatch(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load batches for SQL endpoint " + this.parent.itemName);
			}

			return children;
		}
	}
}