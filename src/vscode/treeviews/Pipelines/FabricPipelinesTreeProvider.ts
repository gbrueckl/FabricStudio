import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { Helper } from '@utils/Helper';
import { iFabricApiDeploymentPipelineStage, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricPipeline } from './FabricPipeline';
import { iFabricApiPipelineDeployableItem } from './iFabricPipelineDeployableItem';
import { FabricPipelineStage } from './FabricPipelineStage';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricPipelinesTreeProvider implements vscode.TreeDataProvider<FabricPipelineTreeItem> {

	private _treeView: vscode.TreeView<FabricPipelineTreeItem>;
	private _previousSelection: { item: FabricPipelineTreeItem, time: number };
	private _onDidChangeTreeData: vscode.EventEmitter<FabricPipelineTreeItem | undefined> = new vscode.EventEmitter<FabricPipelineTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricPipelineTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricPipelineTreeItem>('FabricStudioDeploymentPipelines', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewPipelines = this;
	}

	private async _onDidChangeSelection(items: readonly FabricPipelineTreeItem[]): Promise<void> {
	}

	public get Selection(): readonly FabricPipelineTreeItem[] {
		return this._treeView.selection;
	}

	async refresh(item: FabricPipelineTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		// as tree_item is not always accurate, we refresh based on the actual selection
		if (!item || this._treeView.selection.length == 0) {
			this._onDidChangeTreeData.fire(undefined);
			return;
		}
		if (showInfoMessage) {
			Helper.showTemporaryInformationMessage('Refreshing Fabric Deployment pipelines ...');
		}
		for (let item of this._treeView.selection) {
			// on leaves, we refresh the parent instead
			if (item && item.collapsibleState == vscode.TreeItemCollapsibleState.None) {
				item = item.parent;
			}
			this._onDidChangeTreeData.fire(item);
		}
	}

	getTreeItem(element: FabricPipelineTreeItem): FabricPipelineTreeItem {
		return element;
	}

	getParent(element: FabricPipelineTreeItem): vscode.ProviderResult<FabricPipelineTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricPipelineTreeItem[] = [];
			let items = await FabricApiService.getList<iFabricApiItem>("/v1/deploymentPipelines");

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricPipelineTreeItem.ERROR_ITEM<FabricPipelineTreeItem>(items.error)];
			}
			else {
				for (let item of items.success) {
					let treeItem = new FabricPipeline(item);
					children.push(treeItem);
				}
			}

			children = FabricPipelineTreeItem.handleEmptyItems<FabricPipelineTreeItem>(children, undefined);

			return children;
		}
	}

	async deploySelection(item: FabricPipelineTreeItem = undefined): Promise<void> {
		let itemsSelected: readonly FabricPipelineTreeItem[] = [];

		if (item) {
			itemsSelected = [item];
		}
		else {
			itemsSelected = this._treeView.selection;
		}

		// first items defines the pipeline etc.
		const firstItem = itemsSelected[0] as FabricPipelineTreeItem;
		const pipeline = firstItem.getParentByType<FabricPipeline>("DeploymentPipeline");
		if (!pipeline) {
			const msg = "Could not identify Deployment Pipeline!";
			ThisExtension.Logger.logError(msg, true);
			return;
		}
		const sourceStage = firstItem.getParentByType<FabricPipelineStage>("DeploymentPipelineStage");
		if (!sourceStage) {
			const msg = "Could not identify Deployment Pipeline Source Stage!";
			ThisExtension.Logger.logError(msg, true);
			return;
		}
		const allStages = (await FabricApiService.getList<iFabricApiDeploymentPipelineStage>(pipeline.apiPath + "stages"));
		const targetStage = allStages.success.find(stage => stage.order == sourceStage.order + 1);
		if (!targetStage) {
			const msg = "Could not identify Deployment Pipeline Target Stage!";
			ThisExtension.Logger.logError(msg, true);
			return;
		}

		let itemsToDeploy: iFabricApiPipelineDeployableItem[] = [];
		for (let item of itemsSelected) {
			if (item.getParentByType<FabricPipeline>("DeploymentPipelineStage").id !== sourceStage.id) {
				const msg = "All items must be from the same pipeline and stage!";
				ThisExtension.Logger.logError(msg, true);
				return;
			}
			itemsToDeploy = itemsToDeploy.concat(await (item as FabricPipelineTreeItem).getDeployableItems());
		}

		const apiUrl = Helper.joinPath(pipeline.apiPath, "deploy");

		let body = {
			"sourceStageId": sourceStage.itemId,
			"targetStageId": targetStage.id,
			"items": itemsToDeploy
		};

		const note = await vscode.window.showInputBox({
			title: "Deployment note",
			ignoreFocusOut: true,
			value: "Deployment via FabricStudio",
			prompt: "A note describing the deployment. The text size is limited to 1024 characters."
		});
		if (note == undefined) {
			await Helper.showTemporaryInformationMessage('Deployment aborted!', 4000);
			return
		}
		else if (note.length > 0) {
			const noteJson = { "note": note };
			body = { ...body, ...noteJson };
		}

		const response = await FabricApiService.awaitWithProgress(`Deploying ${itemsToDeploy.length} item(s) to '${targetStage.displayName}'`, FabricApiService.post(apiUrl, body));

		this.refresh(undefined, false);
	}
}
