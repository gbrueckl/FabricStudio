import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricPipeline } from './FabricPipeline';

export class FabricPipelineTreeItem extends FabricApiTreeItem {

	constructor(
		name: string,
		type: FabricApiItemType,
		id: UniqueId,
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
		return "application/vnd.code.tree.fabricstudiopipelines";
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
}
