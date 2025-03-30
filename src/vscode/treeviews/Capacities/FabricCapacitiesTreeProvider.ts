import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { Helper } from '@utils/Helper';
import { iFabricApiCapacity } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricCapacity } from './FabricCapacity';
import { FabricApiTreeItem } from '../FabricApiTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricCapacitiesTreeProvider implements vscode.TreeDataProvider<FabricCapacityTreeItem> {

	private _filter: string;
	private _treeView: vscode.TreeView<FabricCapacityTreeItem>;
	private _previousSelection: { item: FabricCapacityTreeItem, time: number };
	private _onDidChangeTreeData: vscode.EventEmitter<FabricCapacityTreeItem | undefined> = new vscode.EventEmitter<FabricCapacityTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricCapacityTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricCapacityTreeItem>('FabricStudioCapacities', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		this._filter = FabricConfiguration.capacityFilter;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewCapacities = this;
	}

	private async _onDidChangeSelection(items: readonly FabricCapacityTreeItem[]): Promise<void> {
	}

	public get Selection(): readonly FabricCapacityTreeItem[] {
		return this._treeView.selection;
	}

	async refresh(tree_item: FabricCapacityTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		// we always refresh the whole tree as its all built upon one API call
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: FabricCapacityTreeItem): FabricCapacityTreeItem {
		return element;
	}

	getParent(element: FabricCapacityTreeItem): vscode.ProviderResult<FabricCapacityTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricCapacityTreeItem): Promise<FabricCapacityTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricCapacityTreeItem[] = [];
			const regexFilter = this.filterRegEx;

			// seems like /myorg/ also works for guest accounts
			let items = await FabricApiService.getList<iFabricApiCapacity>(`/v1/capacities`);

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricCapacityTreeItem.ERROR_ITEM<FabricCapacityTreeItem>(items.error)];
			}
			else {
				for (let item of items.success) {
					if (regexFilter) {
						const conn = JSON.stringify(item)
						const match = conn.match(regexFilter);
						if (!match) {
							ThisExtension.Logger.logInfo(`Skipping Capacity '${item.id}' because it does not match the Capacity filter '${regexFilter}'.`);
							continue;
						}
					}

					let treeItem = new FabricCapacity(item, null);
					children.push(treeItem);
				}

				children = Array.from(children.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
			}

			children = FabricCapacityTreeItem.handleEmptyItems(children, regexFilter);

			return children;
		}
	}

	public get filterRegEx(): RegExp {
		if (this._filter) {
			return new RegExp(this._filter, "i");
		}
		if (FabricConfiguration.capacityFilter) {
			return FabricConfiguration.capacityFilterRegEx
		}
		return undefined;
	}

	async filter(): Promise<void> {
		const currentFilter = this._filter;

		const filter = await vscode.window.showInputBox({
			title: "Filter Capacities",
			prompt: "Enter a filter to apply to the Capacities. All properties of the Capacity will be considered. Regular Expressions (RegEx) are supported. Leave empty to clear the filter.",
			placeHolder: "Enter a filter to apply to the Capacities",
			value: currentFilter
		});

		if (filter === undefined) {
			return;
		}

		this._filter = filter
		FabricConfiguration.capacityFilter = filter;

		this.refresh(null, true);
	}
}
