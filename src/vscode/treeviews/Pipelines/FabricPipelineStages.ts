import * as vscode from 'vscode';

import {  UniqueId } from '@utils/Helper';

import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricPipelineGenericFolder } from './FabricPipelineGenericFolder';
import { iFabricApiDeploymentPipelineStage } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricPipelineStage } from './FabricPipelineStage';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStages extends FabricPipelineGenericFolder {
	private _pipelineId: UniqueId;

	constructor(
		parent: FabricPipelineTreeItem
	) {
		super(`${parent.pipelineId}/stages`, "Stages", "DeploymentPipelineStages", parent, "stages");
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		if(!FabricApiService.isInitialized) { 			
			return Promise.resolve([]);
		}

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricPipelineStage[] = [];
			let items = await FabricApiService.getList<iFabricApiDeploymentPipelineStage>(this.apiPath);

			for (let item of items.success) {
				let treeItem = new FabricPipelineStage(item, this);
				children.push(treeItem);
			}
			
			return children;
		}
	}
}