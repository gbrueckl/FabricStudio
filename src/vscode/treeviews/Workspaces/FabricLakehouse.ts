import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricLakehouseTables } from './FabricLakehouseTables';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItem } from './FabricItem';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouse extends FabricItem {
	private _properties: iFabricApiLakehouseProperties;

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
			"BROWSE_IN_ONELAKE",
			"COPY_SQL_CONNECTION_STRING",
			"COPY_ONELAKE_FILES_PATH",
			"COPY_ONELAKE_TABLES_PATH",
			"COPY_SQL_CONNECTION_STRING",
			"COPY_SQL_ENDPOINT"
		];

		return orig + actions.join(",") + ",";
	}


	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		const sqlEndpointProp = (await this.getProperties()).sqlEndpointProperties;

		/*
		"sqlEndpointProperties": {
            "connectionString": "rglfde36zlluzctg4s47lhizmm-nkhspyxse5qufn2zauvvsnsqwa.datawarehouse.fabric.microsoft.com",
            "id": "72d28969-e787-4e79-a4f9-5b40edafd80c",
            "provisioningStatus": "Success"
        }
		*/
		const sqlEndpointDefinition: iFabricApiItem = {
			id: sqlEndpointProp.id,
			displayName: `SQL Endpoint ${this.itemName}`,
			type: "SQLEndpoint"
		};

		let sqlEndpoint = new FabricSqlEndpoint(sqlEndpointDefinition, this);
		sqlEndpoint.id = sqlEndpointProp.id + "/Lakehouse";

		children.push(sqlEndpoint)

		children = children.concat(await super.getChildren());
		
		children.push(new FabricLakehouseTables(this));

		return children;
	}

	public async getProperties(): Promise<iFabricApiLakehouseProperties> {
		if (this._properties == null) {
			this._properties = (await FabricApiService.get(this.apiPath)).success;
		}

		return this._properties["properties"];
	}

	public async getSQLConnectionString(): Promise<string> {
		let sqlEndpoint = await this.getSQLEndpoint();

		return `Data Source=${sqlEndpoint},1433;Initial Catalog=${this.itemName};Encrypt=True;Trust Server Certificate=True;`
	}

	public async copySQLConnectionString(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLConnectionString());
	}

	public async getSQLEndpoint(): Promise<string> {
		let properties = await this.getProperties();

		return properties.sqlEndpointProperties.connectionString;
	}

	public async copySQLEndpoint(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLEndpoint());
	}

	public async getOneLakeFilesPath(): Promise<string> {
		let properties = await this.getProperties();

		return properties.oneLakeFilesPath;
	}

	public async copyOneLakeFilesPath(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getOneLakeFilesPath());
	}

	public async getOneLakeTablesPath(): Promise<string> {
		let properties = await this.getProperties();

		return properties.oneLakeTablesPath;
	}

	public async copyOneLakeTablesPath(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getOneLakeTablesPath());
	}

	get oneLakeUri(): vscode.Uri {
	// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		
		return vscode.Uri.parse(`onelake://${workspace.itemId}/${this.itemId}`);
	}
}