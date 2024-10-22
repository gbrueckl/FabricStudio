import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricPipeline } from './FabricPipeline';
import { iFabricApiPipelineDeployableItem, iFabricPipelineDeployableItem } from './iFabricPipelineDeployableItem';

export class FabricPipelineTreeItem extends FabricApiTreeItem implements iFabricPipelineDeployableItem {

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricPipelineTreeItem,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(id, name, type, parent, definition, description, collapsibleState);

		this.itemDefinition = {
			name: name,
			itemType: type,
			id: id
		};

		this.description = this._description;
		this.contextValue = this._contextValue;
	}

	get TreeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudiodeploymentpipelines";
	}

	public get canDelete(): boolean {
		return false;
	}

	public async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	get parent(): FabricPipelineTreeItem {
		return super.parent as FabricPipelineTreeItem;
	}

	set parent(value: FabricPipelineTreeItem) {
		this._parent = value;
	}

	get pipeline(): FabricPipeline {
		const workspace = this.getParentByType<FabricPipeline>("DeploymentPipeline");
		return workspace;
	}

	get pipelineId(): UniqueId {
		return this.pipeline.itemId;
	}

	async getDeployableItems(): Promise<iFabricApiPipelineDeployableItem[]> {
		if (this.collapsibleState == vscode.TreeItemCollapsibleState.None) {
			return Promise.resolve([{ "itemType": this.itemType, sourceItemId: this.itemId }]);
		}
		else {
			let items: iFabricApiPipelineDeployableItem[] = [];
			for (let child of await this.getChildren()) {
				items = items.concat(await (child as iFabricPipelineDeployableItem).getDeployableItems());
			}
			return items;
		}
	}
}
