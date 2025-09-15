import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiWarehouse, iFabricApiWarehouseProperties } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItem } from './FabricItem';
import { update } from 'lodash';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSQLItem extends FabricItem {
	private _properties: any;
	private _sqlEndpointId: string;

	// maps a SQL Endpoint ID to the physical item (Warehouse, Lakehouse, MirroredDatabase, ...)
	// to be able to get the OneLake path from the SQL Endpoint item aswell
	private static _sqlEndpointPhyiscalItemMap: Map<string, FabricSQLItem> = new Map<string, FabricSQLItem>();

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = this._contextValue;

		this.updatePhysicalItemMapping(definition);
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"BROWSE_IN_ONELAKE",
			"COPY_SQL_CONNECTION_STRING",
			"COPY_ONELAKE_FILES_PATH",
			"COPY_ONELAKE_TABLES_PATH",
			"COPY_SQL_ENDPOINT",
			"OPEN_IN_MSSQL_EXTENSION"
		];

		return orig + actions.join(",") + ",";
	}

	private updatePhysicalItemMapping(definition: iFabricApiItem) {
		if (definition.type != "SQLEndpoint") {
			this.getProperties().then((props) => {
				if (props && "sqlEndpointProperties" in props) {
					this._sqlEndpointId = props.sqlEndpointProperties.id;
					// Update static mapping
					FabricSQLItem.setPhysicalSQLItem(this._sqlEndpointId, this);
				}
			});
		}
		else {
			this._sqlEndpointId = definition.id;
		}
	}

	public static getPhysicalSQLItem(sqlEndpointId: string): FabricSQLItem {
		if (!this._sqlEndpointPhyiscalItemMap.has(sqlEndpointId)) {
			return undefined;
		}
		return this._sqlEndpointPhyiscalItemMap.get(sqlEndpointId);
	}

	private static setPhysicalSQLItem(sqlEndpointId: string, value: FabricSQLItem) {
		this._sqlEndpointPhyiscalItemMap.set(sqlEndpointId, value);
	}

	public async getProperties(): Promise<any> {
		if (this._properties == null) {
			this._properties = (await FabricApiService.get(this.apiPath)).success;
		}

		return this._properties["properties"];
	}

	public async getSQLEndpoint(): Promise<string> {
		let sqlEndpoint: string = await this.getSQLEndpointFromProperties();
		if (!sqlEndpoint) {
			sqlEndpoint = await this.getSQLEndpointFromAPI();
		}
		return sqlEndpoint;
	}

	public async getSQLEndpointFromProperties(): Promise<string> {
		try {
			const properties = await this.getProperties();

			if ("sqlEndpointProperties" in properties) {
				return properties.sqlEndpointProperties.connectionString;
			}
			return properties.connectionString;
		}
		catch (error) {
			ThisExtension.Logger.logError(`Error getting SQL Endpoint for '${this.itemName}': ${error}`, true);
		}
	}

	public async getSQLEndpointFromAPI(): Promise<string> {
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

	public async getSQLConnectionString(): Promise<string> {
		let sqlEndpoint = await this.getSQLEndpoint();

		return `Data Source=${sqlEndpoint},1433;Initial Catalog=${this.itemName};Encrypt=True;Trust Server Certificate=True;`
	}

	public async copySQLConnectionString(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLConnectionString());
	}

	public get OneLakeFilesPath(): string {
		// https://onelake.dfs.fabric.microsoft.com/DATA/SampleWarehouse.warehouse/Files
		//return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemId}/${this.itemId}/Files`;
		return vscode.Uri.joinPath(this.oneLakeUri, "Files").toString();
	}

	public async copyOneLakeFilesPath(): Promise<void> {
		vscode.env.clipboard.writeText(this.OneLakeFilesPath);
	}

	public get OneLakeTablesPath(): string {
		// https://onelake.dfs.fabric.microsoft.com/DATA/SampleWarehouse.warehouse/Tables/dbo/Date
		//return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemId}/${this.itemId}/Tables`;
		return vscode.Uri.joinPath(this.oneLakeUri, "Tables").toString();
	}

	public async copyOneLakeTablesPath(): Promise<void> {
		vscode.env.clipboard.writeText(this.OneLakeTablesPath);
	}

	public get oneLakeUri(): vscode.Uri {
		if(this.itemType == "SQLEndpoint") {
			return vscode.Uri.parse(`onelake://${this.workspace.itemId}/${FabricSQLItem.getPhysicalSQLItem(this._sqlEndpointId).itemId}`);
			//return vscode.Uri.parse(`onelake://${this.workspace.itemName}/${this.itemName}.${this.itemType}`);
		}
		return vscode.Uri.parse(`onelake://${this.workspace.itemId}/${FabricSQLItem.getPhysicalSQLItem(this._sqlEndpointId).itemId}`);
		//return vscode.Uri.parse(`onelake://${this.workspace.itemName}/${this.itemName}.${this.itemType}`);
	}

	public async browseInOneLake(): Promise<void> {
		const extensionId = "GerhardBrueckl.onelake-vscode";
		const oneLakeExtensionInstalled = await Helper.ensureExtensionInstalled(extensionId, "OneLake");

		if (!oneLakeExtensionInstalled) {
			return;
		}

		if (this.oneLakeUri) {
			Helper.addToWorkspace(this.oneLakeUri, `OneLake - ${this.label}`, true, true);
		}
		else {
			vscode.window.showErrorMessage("Item/Folder cannot be browsed in OneLake!");
		}
	}

	public async openInMSSQLExtension(): Promise<void> {
		const sqlEndpoint = await this.getSQLEndpoint();
		ThisExtension.openInMSSQLExtension(sqlEndpoint, this.itemName, { "profileName": `${this.workspace.itemName} - ${this.itemName}` });
	}
}