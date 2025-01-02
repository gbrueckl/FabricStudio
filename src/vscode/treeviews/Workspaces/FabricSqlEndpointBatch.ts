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

		this._itemDefinition = definition;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get apiPath(): string {
		return this.parent.apiPath + "/" + this.itemDefinition.batchId
	}

	get itemDefinition(): iPowerBiSqlEndpointSyncBatch {
		return this._itemDefinition;
	}
}