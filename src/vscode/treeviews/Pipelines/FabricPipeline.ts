import * as vscode from 'vscode';

import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricPipelineStages } from './FabricPipelineStages';
import { ThisExtension } from '../../../ThisExtension';
import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipeline extends FabricPipelineTreeItem {

	constructor(
		definition: iFabricApiItem
	) {
		super(definition.displayName, "DeploymentPipeline", definition.id, undefined, vscode.TreeItemCollapsibleState.Collapsed);
		this.itemDefinition = definition;
		
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DELETE"
		];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		let children: FabricPipelineTreeItem[] = [];
		
		children.push(new FabricPipelineStages(this));
		//children.push(new FabricPipelineOperations(this));

		return children;
	}

	get apiUrlPart(): string {
		return "deploymentPipelines/" + (this.itemId);
	}

	// Pipeline-specific funtions
}