import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWarehouse, iFabricApiWarehouseProperties } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouse extends FabricItem {
	private _properties: iFabricApiWarehouseProperties;

	constructor(
		definition: iFabricApiWarehouse,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.itemDefinition = definition;
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
			"COPY_SQL_ENDPOINT",
			"OPEN_IN_MSSQL_EXTENSION"
		];

		return orig + actions.join(",") + ",";
	}

	get itemDefinition(): iFabricApiWarehouse {
		return <iFabricApiWarehouse>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWarehouse) {
		this._itemDefinition = value;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children = children.concat(await super.getChildren());

		return children;
	}

	public async getProperties(): Promise<iFabricApiWarehouseProperties> {
		if (this._properties == null) {
			this._properties = (await FabricApiService.get(this.apiPath)).success;
		}

		return this._properties["properties"];
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

	public async getSQLConnectionString(): Promise<string> {
		let sqlEndpoint = await this.getSQLEndpoint();

		return `Data Source=${sqlEndpoint},1433;Initial Catalog=${this.itemName};Encrypt=True;Trust Server Certificate=True;`
	}

	public async copySQLConnectionString(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getSQLConnectionString());
	}

	public async getOneLakeFilesPath(): Promise<string> {
		// https://onelake.dfs.fabric.microsoft.com/DATA/SampleWarehouse.warehouse/Files
		return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemId}/${this.itemId}/Files`;
		return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemName}/${this.itemName}/Files`;
	}

	public async copyOneLakeFilesPath(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getOneLakeFilesPath());
	}

	public async getOneLakeTablesPath(): Promise<string> {
		// https://onelake.dfs.fabric.microsoft.com/DATA/SampleWarehouse.warehouse/Tables/dbo/Date
		return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemId}/${this.itemId}/Tables`;
		return `https://onelake.dfs.fabric.microsoft.com/${this.workspace.itemName}/${this.itemName}/Tables`;
	}

	public async copyOneLakeTablesPath(): Promise<void> {
		vscode.env.clipboard.writeText(await this.getOneLakeTablesPath());
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");

		return vscode.Uri.parse(`onelake://${workspace.itemId}/${this.itemId}`);
	}

	public async openInMSSQLExtension(): Promise<void> {
		const sqlEndpoint = await this.getSQLEndpoint();
		ThisExtension.openInMSSQLExtension(sqlEndpoint, this.itemName);
	}
}