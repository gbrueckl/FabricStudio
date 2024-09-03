import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricLakehouseTables } from './FabricLakehouseTables';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemShortcuts } from './FabricItemShortcuts';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouse extends FabricWorkspaceTreeItem {
	private _properties: iFabricApiLakehouseProperties;

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.displayName, "Lakehouse", parent, definition, definition.description);

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

		children.push(new FabricLakehouseTables(this));

		let shortcuts = new FabricItemShortcuts(this);
		const shortcutsChildren = await shortcuts.getChildren();
		if (shortcutsChildren.length > 0) {
			children.push(shortcuts);
		}

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