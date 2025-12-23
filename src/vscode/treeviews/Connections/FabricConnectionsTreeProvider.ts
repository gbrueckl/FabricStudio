import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { iFabricApiConnection, iFabricApiGateway } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricGateway } from './FabricGateway';
import { FabricConnection } from './FabricConnection';
import { FabricApiTreeItem } from '../FabricApiTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricConnectionsTreeProvider implements vscode.TreeDataProvider<FabricConnectionTreeItem> {

	private _filter: string;
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
		this._filter = FabricConfiguration.connectionFilter;
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
		// we always refresh the whole tree as its all built upon one API call
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: FabricConnectionTreeItem): FabricConnectionTreeItem {
		return element;
	}

	getParent(element: FabricConnectionTreeItem): vscode.ProviderResult<FabricConnectionTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricConnectionTreeItem[] = [];
			const regexFilter = this.filterRegEx;
			let treeItem: FabricGateway;
			let gateways: Map<string, FabricGateway> = new Map<string, FabricGateway>();

			// seems like /myorg/ also works for guest accounts
			let gatewayList = await FabricApiService.getList<iFabricApiGateway>("/v1/gateways");
			let items = await FabricApiService.getList<iFabricApiConnection>("/v1/connections");

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricConnectionTreeItem.ERROR_ITEM<FabricConnectionTreeItem>(items.error)];
			}
			else {
				let itemToAdd: FabricConnection;
				for (let item of items.success) {
					if (regexFilter) {
						const conn = JSON.stringify(item)
						const match = conn.match(regexFilter);
						if (!match) {
							ThisExtension.Logger.logInfo(`Skipping connection '${item.displayName}' (${item.id}) because it does not match the connection filter '${regexFilter}'.`);
							continue;
						}
					}

					const gateway = item.gatewayId ?? item.connectivityType;

					if (!gateways.has(gateway)) {
						treeItem = new FabricGateway(
							item,
							gatewayList.success.find(g => g.id === item.gatewayId)
						);

						gateways.set(gateway, treeItem);
					}

					itemToAdd = new FabricConnection(item, gateways.get(gateway));

					gateways.get(gateway).addChild(itemToAdd);
				}

				children = Array.from(gateways.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
			}

			children = FabricConnectionTreeItem.handleEmptyItems(children, regexFilter);

			return children;
		}
	}

	public get filterRegEx(): RegExp {
		if (this._filter) {
			return new RegExp(this._filter, "i");
		}
		if (FabricConfiguration.connectionFilter) {
			return FabricConfiguration.connectionFilterRegEx
		}
		return undefined;
	}

	async filter(): Promise<void> {
		const currentFilter = this._filter;

		const filter = await vscode.window.showInputBox({
			title: "Filter Connections",
			prompt: "Enter a filter to apply to the connections. All properties of the connection will be considered. Regular Expressions (RegEx) are supported. Leave empty to clear the filter.",
			placeHolder: "Enter a filter to apply to the connections",
			value: currentFilter
		});

		if (filter === undefined) {
			return;
		}

		this._filter = filter;
		FabricConfiguration.connectionFilter = filter;

		this.refresh(null, true);
	}
}
