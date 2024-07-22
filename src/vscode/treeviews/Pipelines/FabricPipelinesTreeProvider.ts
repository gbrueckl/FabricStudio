import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { Helper } from '@utils/Helper';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricPipelineTreeItem } from './FabricPipelineTreeItem';
import { FabricPipeline } from './FabricPipeline';

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
			canSelectMany: false
		});
		this._treeView = view;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewPipelines = this;
	}

	private async _onDidChangeSelection(items: readonly FabricPipelineTreeItem[]): Promise<void> {
	}

	async refresh(item: FabricPipelineTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		if (showInfoMessage) {
			Helper.showTemporaryInformationMessage('Refreshing Fabric Deployment pipelines ...');
		}
		// on leaves, we refresh the parent instead
		if (item && item.collapsibleState == vscode.TreeItemCollapsibleState.None) {
			item = item.parent;
		}
		this._onDidChangeTreeData.fire(item);
	}

	getTreeItem(element: FabricPipelineTreeItem): FabricPipelineTreeItem {
		return element;
	}

	getParent(element: FabricPipelineTreeItem): vscode.ProviderResult<FabricPipelineTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricPipelineTreeItem): Promise<FabricPipelineTreeItem[]> {
		const initialized = await FabricApiService.Initialization();

		if (!initialized) {
			// maybe return an error here or a Dummy TreeItem saying "Not initialized" ?
			return [];
		}

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricPipelineTreeItem[] = [];
			let items = await FabricApiService.getList<iFabricApiItem>("/v1/deploymentPipelines");

			if (items.error) {
				vscode.window.showErrorMessage(items.error.message);
				return [];
			}

			for (let item of items.success) {
				let treeItem = new FabricPipeline(item);
				children.push(treeItem);
			}

			return children;
		}
	}
}
