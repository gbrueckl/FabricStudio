import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
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
			"SYNC_METADATA",
			"COPY_SQL_CONNECTION_STRING",
			"COPY_SQL_ENDPOINT",
			"OPEN_IN_MSSQL_EXTENSION"
		];

		return orig + actions.join(",") + ",";
	}

	public async getSQLConnectionString(): Promise<string> {
		let sqlEndpoint = await this.getSQLEndpoint();

		return `Data Source=${sqlEndpoint},1433;Initial Catalog=${this.itemName};Encrypt=True;Trust Server Certificate=True;`
	}

	public async copySQLConnectionString(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLConnectionString());
	}

	public async getSQLEndpoint(): Promise<string> {
		let apiPath = Helper.joinPath(this.apiPath, "connectionString");

		let urlParams: { [key: string]: string } = {};
		if (FabricApiService.TenantId != null) {
			urlParams["guestTenantId"] = FabricApiService.TenantId;
		}
		// if(this.workspace.privateLink) {
		// 	urlParams["privateLinkType"] = "Workspace";
		// }

		if (Object.keys(urlParams).length > 0) {
			apiPath += "?";

			for (const [key, value] of Object.entries(urlParams)) {
				apiPath += `${key}=${value}&`;
			}
		}
		const response = (await FabricApiService.get(apiPath)).success;
		return response.connectionString;
	}

	public async copySQLEndpoint(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLEndpoint());
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = await super.getChildren();

		children.push(new FabricSqlEndpointBatches(this));

		return children;
	}

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

	public async openInMSSQLExtension(): Promise<void> {
		const sqlEndpoint = await this.getSQLEndpoint();
		ThisExtension.openInMSSQLExtension(sqlEndpoint, this.itemName);
	}
}