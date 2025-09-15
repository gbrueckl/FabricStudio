import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricSQLItem } from './FabricSQLItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlEndpoint extends FabricSQLItem {

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	}

	/* Overwritten properties from FabricApiTreeItem */

	static async syncMetadata(sqlEndpoint: FabricSqlEndpoint): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/sqlendpoint/items/refresh-sql-endpoint-metadata?tabs=HTTP

		const preview: boolean = true;
		const endpoint = Helper.joinPath(sqlEndpoint.apiPath, `refreshMetadata?preview=${preview}`);

		const response = await FabricApiService.post(endpoint, {}, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			ThisExtension.Logger.logError(`Metadata Sync failed for SQL Endpoint '${sqlEndpoint.itemName}': ${response.error.message}`, true);
		}
		else {
			ThisExtension.Logger.logInfo(`Metadata Sync started for SQL Endpoint '${sqlEndpoint.itemName}' ...`, 5000);
		}
	}

	async syncMetadataOld(): Promise<void> {
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