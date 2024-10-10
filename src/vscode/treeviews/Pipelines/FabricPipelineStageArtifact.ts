import * as vscode from 'vscode';

import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { iFabricApiDeploymentPipelineStageItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricPipelineStage } from './FabricPipelineStage';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStageArtifact extends FabricPipelineTreeItem {
	constructor(
		definition: iFabricApiDeploymentPipelineStageItem,
		parent: FabricPipelineTreeItem
	) {
		super(definition.itemDisplayName, definition.itemType, definition.itemId, parent, definition, definition.lastDeploymentTime, vscode.TreeItemCollapsibleState.None);
	
		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DEPLOY"
		];

		return orig + actions.join(",") + ",";
	}

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

	public getBrowserLink(): vscode.Uri {
		//https://app.powerbi.com/groups/ccce57d1-10af-1234-1234-665f8bbd8458/datasets/7cdff921-9999-8888-b0c8-34be20567742

		const stage = this.getParentByType<FabricPipelineStage>("DeploymentPipelineStage");

		const itemUrl = `/workspaces/${stage.itemDefinition.workspaceId}/items/${this.itemId}`;

		return vscode.Uri.joinPath(vscode.Uri.parse(FabricApiService.BrowserBaseUrl), itemUrl);
	}
}