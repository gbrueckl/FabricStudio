import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiLakehouseTable } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouseTable extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiLakehouseTable,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.name, definition.name, "LakehouseTable", parent, definition, undefined, vscode.TreeItemCollapsibleState.None);

		this.id = parent.parent.itemId + "/" + definition.name,

			this.tooltip = this.getToolTip(this.itemDefinition);
		this.description = this._description;

		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricApiTreeItem */
	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("layout-panel-justify");
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSEONELAKE"];

		return orig + actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.tableType} - ${this.tableFormat}`;
		}
	}

	// LakehouseTable-specific funtions
	get itemDefinition(): iFabricApiLakehouseTable {
		return this._itemDefinition;
	}

	get tableType(): string {
		return this.itemDefinition.type
	}

	get tableFormat(): string {
		return this.itemDefinition.format
	}

	get tableLocation(): string {
		return this.itemDefinition.location
	}

	async runMaintenanceJob(): Promise<void> {
		// https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-api#table-maintenance-api-request

		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{lakehouseId}/jobs/instances?jobType=TableMaintenance
		{
			"executionData": {
				"tableName": "{table_name}",
				"optimizeSettings": {
					"vOrder": true,
					"zOrderBy": [
						"tipAmount"
					]
				},
				"vacuumSettings": {
					"retentionPeriod": "7.01:00:00"
				}
			}
		}
		*/
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const lakehouse = this.getParentByType<FabricWorkspace>("Lakehouse");

		return vscode.Uri.parse(`onelake://${workspace.itemName}/${lakehouse.itemName}.Lakehouse/Tables/${this.itemName}`);
	}

	async runMaintainanceJob(): Promise<void> {
		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{lakehouseId}/jobs/instances?jobType=TableMaintenance
		{
			"executionData": {
				"tableName": "{table_name}",
				"optimizeSettings": {
					"vOrder": true,
					"zOrderBy": [
						"tipAmount"
					]
				},
				"vacuumSettings": {
					"retentionPeriod": "7.01:00:00"
				}
			}
		}
		*/

		const lakehouse = this.getParentByType("Lakehouse");

		const endpoint = lakehouse.apiPath + "/jobs/instances?jobType=TableMaintenance";
		const body = {
			"executionData": {
				"tableName": this.itemName,
				"optimizeSettings": {
					"vOrder": true
				}
			}
		}

		const response = await FabricApiService.post(endpoint, body, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Maintenance job started for table ${this.itemName}. (Tracking: GET ${response.success.url})`, 15000);
		}
	}
}