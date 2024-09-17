import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricDataPipeline extends FabricItem {
	private _properties: iFabricApiLakehouseProperties;

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"EDIT_DEFINITION"
		];

		return orig + actions.join(",") + ",";
	}

	async runPipeline(body: any): Promise<void> {
		// https://learn.microsoft.com/en-us/fabric/data-factory/pipeline-rest-api#run-on-demand-item-job

		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/<your WS Id>/items/<pipeline id>/jobs/instances?jobType=Pipeline
		{ 
			"executionData": { 
				"parameters": {
					"param_waitsec": 10" 
				} 
			} 
		}
		*/
	}
}