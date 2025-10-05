import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouse, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricLakehouseTables } from './FabricLakehouseTables';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';
import { FabricSqlEndpoints } from './FabricSqlEndpoints';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricSQLItem } from './FabricSQLItem';
import { FabricSparkKernelManager } from '../../notebook/spark/FabricSparkKernelManager';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouse extends FabricSQLItem {
	constructor(
		definition: iFabricApiLakehouse,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.itemDefinition = definition;
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
		this.contextValue = this._contextValue;

		FabricSparkKernelManager.createKernels(this.itemDefinition);
	}

	/* Overwritten properties from FabricApiTreeItem */
	get itemDefinition(): iFabricApiLakehouse {
		return <iFabricApiLakehouse>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiLakehouse) {
		this._itemDefinition = value;
	}


	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		const sqlEndpointProp = (await this.getProperties())["sqlEndpointProperties"];

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

		let sqlEndpointParent = new FabricSqlEndpoints(this.workspace) as FabricWorkspaceTreeItem;
		if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
			sqlEndpointParent = this.workspace
		}
		let sqlEndpoint = new FabricSqlEndpoint(sqlEndpointDefinition, sqlEndpointParent);
		sqlEndpoint.id = sqlEndpointProp.id + "/Lakehouse";

		children.push(sqlEndpoint)

		children = children.concat(await super.getChildren());

		children.push(new FabricLakehouseTables(this));
		children.push(await this.getChildItemLivySessions(this));

		return children;
	}
}


export interface FabricLakehouse extends FabricItemLivyMixin {}
applyMixins(FabricLakehouse, [FabricItemLivyMixin]);
//Object.assign(FabricLakehouse.prototype, FabricItemLivyMixin);