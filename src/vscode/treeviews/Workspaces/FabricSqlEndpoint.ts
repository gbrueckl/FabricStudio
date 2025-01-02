import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';
import { FabricSqlEndpointBatches } from './FabricSqlEndpointBatches';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlEndpoint extends FabricItem {

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"SYNC_METADATA"
		];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = await super.getChildren();

		children.push(new FabricSqlEndpointBatches(this));

		return children;
	}

	async syncMetadata(): Promise<void> {
		// https://learn.microsoft.com/en-us/fabric/data-factory/pipeline-rest-api#run-on-demand-item-job

		const endpoint = `https://api.powerbi.com/v1.0/myorg/lhdatamarts/${this.itemId}`;

		const body = {
			"commands": [
				{
					"$type": "MetadataRefreshCommand"
				}
			]
		}

		const response = await FabricApiService.post(endpoint, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			const msg = `Metadata Sync started for SQL Endpoint '${this.itemName}'. (Tracking: GET ${endpoint}/batches/${response.success.batchId})`;
			ThisExtension.Logger.logInfo(msg);
			Helper.showTemporaryInformationMessage(msg, 10000);
		}
	}
}