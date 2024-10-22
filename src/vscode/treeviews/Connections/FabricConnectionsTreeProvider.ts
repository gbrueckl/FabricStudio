import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { Helper } from '@utils/Helper';
import { iFabricApiConnection, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricGateway } from './FabricGateway';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { FabricConnection } from './FabricConnection';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricConnectionsTreeProvider implements vscode.TreeDataProvider<FabricConnectionTreeItem> {

	private _treeView: vscode.TreeView<FabricConnectionTreeItem>;
	private _previousSelection: { item: FabricConnectionTreeItem, time: number };
	private _onDidChangeTreeData: vscode.EventEmitter<FabricConnectionTreeItem | undefined> = new vscode.EventEmitter<FabricConnectionTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricConnectionTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricConnectionTreeItem>('FabricStudioConnections', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewConnections = this;
	}

	private async _onDidChangeSelection(items: readonly FabricConnectionTreeItem[]): Promise<void> {
	}

	public get Selection(): readonly FabricConnectionTreeItem[] {
		return this._treeView.selection;
	}

	async refresh(tree_item: FabricConnectionTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		// as tree_item is not always accurate, we refresh based on the actual selection
		if (this._treeView.selection.length == 0) {
			this._onDidChangeTreeData.fire(undefined);
			return;
		}
		if (showInfoMessage) {
			Helper.showTemporaryInformationMessage('Refreshing Fabric Connections ...');
		}
		for (let item of this._treeView.selection) {
			// on leaves, we refresh the parent instead
			if (item && item.collapsibleState == vscode.TreeItemCollapsibleState.None) {
				item = item.parent;
			}
			this._onDidChangeTreeData.fire(item);
		}
	}

	getTreeItem(element: FabricConnectionTreeItem): FabricConnectionTreeItem {
		return element;
	}

	getParent(element: FabricConnectionTreeItem): vscode.ProviderResult<FabricConnectionTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		const initialized = await FabricApiService.Initialization();

		if (!initialized) {
			// maybe return an error here or a Dummy TreeItem saying "Not initialized" ?
			return [];
		}

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricConnectionTreeItem[] = [];
			let treeItem: FabricGateway;
			let gateways: Map<string, FabricGateway> = new Map<string, FabricGateway>();

			//let items = await FabricApiService.getList<iFabricApiConnection>(`https://api.powerbi.com/v2.0/${FabricApiService.TenantId}/me/gatewayClusterDatasources`);
			let items = await FabricApiService.getList<iFabricApiConnection>(`https://api.powerbi.com/v2.0/myorg/me/gatewayClusterDatasources`);


			if (items.error) {
				ThisExtension.Logger.logError(items.error.message, true);
				return [];
			}

			let itemToAdd: FabricConnection;
			for (let item of items.success) {
				if (!gateways.has(item.clusterId)) {
					treeItem = new FabricGateway(
						item
					);

					gateways.set(item.clusterId, treeItem);
				}

				itemToAdd = new FabricConnection(item, gateways.get(item.clusterId));

				gateways.get(item.clusterId).addChild(itemToAdd);
			}

			children = Array.from(gateways.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

			return children;
		}
	}

	async filter(): Promise<void> {
		const currentFilter = FabricConfiguration.connectionFilter;

		const filter = await vscode.window.showInputBox({
			title: "Filter Connections",
			prompt: "Enter a filter to apply to the connections. Regular Expressions (RegEx) are supported. Leave empty to clear the filter.",
			placeHolder: "Enter a filter to apply to the workspaces",
			value: currentFilter
		});

		if (filter === undefined) {
			return;
		}

		FabricConfiguration.connectionFilter = filter;

		this.refresh(null, true);
	}
}
