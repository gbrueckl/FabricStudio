import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricMirroredDatabaseTables } from './FabricMirroredDatabaseTables';
import { FabricMirroredDatabaseSynchronization } from './FabricMirroredDatabaseSynchronization';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricMirroredDatabase extends FabricItem {
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
			"EDIT_DEFINITION",
			"COPY_ONELAKE_TABLES_PATH",
			"COPY_SQL_CONNECTION_STRING",
			"COPY_SQL_ENDPOINT",
			"BROWSE_IN_ONELAKE"
		];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = await super.getChildren();

		let synchronization = new FabricMirroredDatabaseSynchronization(this);
		await synchronization.updateMirroringStatus()
		children.push(synchronization);

		children.push(new FabricMirroredDatabaseTables(this));

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

	get oneLakeUri(): vscode.Uri {
	// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		
		return vscode.Uri.parse(`onelake://${workspace.itemId}/${this.itemId}`);
	}
}