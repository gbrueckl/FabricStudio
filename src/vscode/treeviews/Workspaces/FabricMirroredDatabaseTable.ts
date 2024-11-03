import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiLakehouseTable, iFabricApiTableMirroringStatusResponse } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricMirroredDatabaseTable extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiTableMirroringStatusResponse,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.sourceSchemaName + definition.sourceTableName, definition.sourceSchemaName + definition.sourceTableName, "MirroredDatabaseTable", parent, definition, definition.status, vscode.TreeItemCollapsibleState.None);

		this.id = parent.id + "/" + definition.sourceSchemaName + "." + definition.sourceTableName,

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

		let actions: string[] = [];

		return orig + actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.metrics.lastSyncDateTime} - ${this.itemDefinition.metrics.processedRows} rows`;
		}
	}

	// LakehouseTable-specific funtions
	get itemDefinition(): iFabricApiTableMirroringStatusResponse {
		return this._itemDefinition;
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const lakehouse = this.getParentByType<FabricWorkspace>("Lakehouse");

		return vscode.Uri.parse(`onelake://${workspace.itemId}/${lakehouse.itemId}/Tables/${this.itemName}`);
	}
}