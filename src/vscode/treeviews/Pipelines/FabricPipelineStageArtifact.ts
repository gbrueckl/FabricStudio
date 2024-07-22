import * as vscode from 'vscode';

import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { iFabricApiDeploymentPipelineStageItem } from '../../../fabric/_types';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStageArtifact extends FabricPipelineTreeItem {
	constructor(
		definition: iFabricApiDeploymentPipelineStageItem,
		parent: FabricPipelineTreeItem
	) {
		super(definition.itemDisplayName, definition.itemType, definition.itemId, parent, definition, definition.lastDeploymentTime, vscode.TreeItemCollapsibleState.None);
	}


	/* Overwritten properties from FabricApiTreeItem */
	get itemDefinition(): iFabricApiDeploymentPipelineStageItem {
		return super.itemDefinition as iFabricApiDeploymentPipelineStageItem;
	}

	set itemDefinition(value: iFabricApiDeploymentPipelineStageItem) {
		super.itemDefinition = value;
	}

	// properties of iFabricPipelineDeployableItem
	get artifactIds(): { sourceItemId: string }[] {
		return [{ "sourceItemId": this.itemDefinition.sourceItemId }];
	}
	get artifactType(): string {
		return this.itemType.toLowerCase() + "s";
	}

	async getDeployableItems(): Promise<{ [key: string]: { sourceId: string }[] }> {
		let obj = {};
		obj[this.artifactType] = this.artifactIds;
		return obj;
	}
}