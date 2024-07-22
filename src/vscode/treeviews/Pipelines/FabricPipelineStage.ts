import * as vscode from 'vscode';


import { Helper, UniqueId } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';
import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricApiItemType, iFabricApiDeploymentPipelineStage, iFabricApiDeploymentPipelineStageItem } from '../../../fabric/_types';
import { FabricPipelineGenericFolder } from './FabricPipelineGenericFolder';
import { FabricPipelineStageArtifact } from './FabricPipelineStageArtifact';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStage extends FabricPipelineTreeItem {

	constructor(
		definition: iFabricApiDeploymentPipelineStage,
		parent: FabricPipelineTreeItem
	) {
		super(definition.displayName, "DeploymentPipelineStages", definition.id, parent, vscode.TreeItemCollapsibleState.Collapsed);

		this.itemDefinition = definition;
	}


	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

		if (this.itemDefinition.workspaceId) {
			actions.push("UNASSIGN");
		}
		else
		{
			actions.push("ASSIGN");
		}

		return orig + actions.join(",") + ",";
	}

	get itemDefinition(): iFabricApiDeploymentPipelineStage {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiDeploymentPipelineStage) {
		this._itemDefinition = value;
	}

	get apiUrlPart(): string {
		return this.itemDefinition.id.toString();
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		let children: FabricPipelineGenericFolder[] = [];
		let treeItem: FabricPipelineGenericFolder;
		let itemTypes: Map<FabricApiItemType, FabricPipelineGenericFolder> = new Map<FabricApiItemType, FabricPipelineGenericFolder>();

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			try {
				const items = await FabricApiService.getList<iFabricApiDeploymentPipelineStageItem>(this.apiPath + "items");
				let itemToAdd: FabricPipelineStageArtifact;
				for (let item of items.success) {
					if (!itemTypes.has(item.itemType)) {
							treeItem = new FabricPipelineGenericFolder(
								this.itemId + "/" + item.itemType + "s",
								item.itemType + "s",
								item.itemType + "s" as FabricApiItemType,
								this
							);
						itemTypes.set(item.itemType, treeItem);
					}

					itemToAdd = new FabricPipelineStageArtifact(item, this);
					itemTypes.get(item.itemType).addChild(itemToAdd);
				}

				children = Array.from(itemTypes.values());
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load items for pipeline " + this.pipeline.itemName);
			}

			return children;
		}
	}

	// properties of iFabricPipelineDeployableItem
	get artifactIds(): {sourceId: string}[] {
		return [];
	}
	get artifactType(): string
	{
		return this.itemType;
	}

	// Pipelinestage-specific funtions
	
}