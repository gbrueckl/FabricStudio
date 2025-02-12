import * as vscode from 'vscode';

import { FabricSqlEndpointBatches } from './FabricSqlEndpointBatches';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlEndpointBatch extends FabricWorkspaceGenericViewer {

	constructor(
		definition: iPowerBiSqlEndpointSyncBatch,
		parent: FabricSqlEndpointBatches
	) {
		super(definition.startTimeStamp.toString(), parent);

		this.itemDefinition = definition;

		this.description = this._description;

		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricApiTreeItem */

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.batchType} - ${this.itemDefinition.progressState}`;
		}
	}

	getIcon(): vscode.ThemeIcon {
		if (this.itemDefinition) {
			if (this.itemDefinition.progressState == "success") {
				return new vscode.ThemeIcon("check");
			}
			else if (this.itemDefinition.progressState == "failure") {
				return new vscode.ThemeIcon("error");
			}
			else {
				return new vscode.ThemeIcon("sync~spin");
			}
		}
	}

	get apiPath(): string {
		return this.parent.apiPath + "/" + this.itemDefinition.batchId
	}

	get itemDefinition(): iPowerBiSqlEndpointSyncBatch {
		return this._itemDefinition;
	}

	set itemDefinition(value: iPowerBiSqlEndpointSyncBatch) {
		this._itemDefinition = value;
	}
}