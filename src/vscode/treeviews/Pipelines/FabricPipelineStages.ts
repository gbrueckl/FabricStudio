import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricPipelineGenericFolder } from './FabricPipelineGenericFolder';
import { iFabricApiDeploymentPipelineStage } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricPipelineStage } from './FabricPipelineStage';
import { ThisExtension } from '../../../ThisExtension';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricPipelineStages extends FabricPipelineGenericFolder {
	private _pipelineId: UniqueId;

	constructor(
		parent: FabricPipelineTreeItem
	) {
		super(`${parent.pipelineId}/stages`, "Stages", "DeploymentPipelineStages", parent, "stages");
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricPipelineStage[] = [];
			try {
				let items = await FabricApiService.getList<iFabricApiDeploymentPipelineStage>(this.apiPath, undefined, "value", "order");

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricPipelineTreeItem.ERROR_ITEM<FabricPipelineTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricPipelineStage(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "deployment pipeline stages");
			}

			return children;
		}
	}
}