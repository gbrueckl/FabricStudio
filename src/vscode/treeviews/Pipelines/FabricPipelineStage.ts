import * as vscode from 'vscode';


import { Helper, UniqueId } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';
import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricApiItemType, iFabricApiDeploymentPipelineStage, iFabricApiDeploymentPipelineStageItem } from '../../../fabric/_types';
import { FabricPipelineGenericFolder } from './FabricPipelineGenericFolder';
import { FabricPipelineStageArtifact } from './FabricPipelineStageArtifact';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { iFabricApiPipelineDeployableItem, iFabricPipelineDeployableItem } from './iFabricPipelineDeployableItem';
import { FabricMapper } from '../../../fabric/FabricMapper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStage extends FabricPipelineTreeItem implements iFabricPipelineDeployableItem {

	constructor(
		definition: iFabricApiDeploymentPipelineStage,
		parent: FabricPipelineTreeItem
	) {
		super(definition.id, definition.displayName, "DeploymentPipelineStage", parent, vscode.TreeItemCollapsibleState.Collapsed);

		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
		this.iconPath = new vscode.ThemeIcon("server-environment");
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DEPLOY"
		];

		if (this.itemDefinition.workspaceId) {
			actions.push("UNASSIGN");
		}
		else
		{
			actions.push("ASSIGN");
		}

		return orig + actions.join(",") + ",";
	}

	public get canOpenInBrowser(): boolean {
		return false;
	}

	get itemDefinition(): iFabricApiDeploymentPipelineStage {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiDeploymentPipelineStage) {
		this._itemDefinition = value;
	}

	get order(): number {
		return this.itemDefinition.order;
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
						const plural = FabricMapper.getItemTypePlural(item.itemType);
							treeItem = new FabricPipelineGenericFolder(
								this.itemId + "/" + plural,
								plural,
								plural as FabricApiItemType,
								this,
								undefined,
								["DEPLOY"]
							);
						itemTypes.set(item.itemType, treeItem);
					}

					itemToAdd = new FabricPipelineStageArtifact(item, this);
					itemTypes.get(item.itemType).addChild(itemToAdd);
				}

				children = Array.from(itemTypes.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load items for pipeline " + this.pipeline.itemName, true);
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