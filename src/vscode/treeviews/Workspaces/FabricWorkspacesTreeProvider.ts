import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { Helper } from '@utils/Helper';
import { iFabricApiWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricWorkspacesTreeProvider implements vscode.TreeDataProvider<FabricWorkspaceTreeItem> {

	private _filter: string;
	private _treeView: vscode.TreeView<FabricWorkspaceTreeItem>;
	private _previousSelection: { item: FabricWorkspaceTreeItem, time: number };
	private _onDidChangeTreeData: vscode.EventEmitter<FabricWorkspaceTreeItem | undefined> = new vscode.EventEmitter<FabricWorkspaceTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricWorkspaceTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricWorkspaceTreeItem>('FabricStudioWorkspaces', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: false,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		this._filter = FabricConfiguration.workspaceFilter;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewWorkspaces = this;
	}

	private async _onDidChangeSelection(items: readonly FabricWorkspaceTreeItem[]): Promise<void> {
	}

	public get Selection(): readonly FabricWorkspaceTreeItem[] {
		return this._treeView.selection;
	}

	async refresh(item: FabricWorkspaceTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		// as tree_item is not always accurate, we refresh based on the actual selection
		if (!item || this._treeView.selection.length == 0) {
			this._onDidChangeTreeData.fire(undefined);
			return;
		}
		if (showInfoMessage) {
			Helper.showTemporaryInformationMessage('Refreshing Fabric Workspaces ...');
		}
		for (let item of this._treeView.selection) {
			// on leaves, we refresh the parent instead
			if (item && item.collapsibleState == vscode.TreeItemCollapsibleState.None) {
				item = item.parent;
			}
			this._onDidChangeTreeData.fire(item);
		}
	}

	getTreeItem(element: FabricWorkspaceTreeItem): FabricWorkspaceTreeItem {
		return element;
	}

	getParent(element: FabricWorkspaceTreeItem): vscode.ProviderResult<FabricWorkspaceTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		const initialized = await FabricApiService.Initialization();

		if (!initialized) {
			// maybe return an error here or a Dummy TreeItem saying "Not initialized" ?
			return [];
		}

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];
			let items = await FabricApiService.getList<iFabricApiWorkspace>("/v1/workspaces");

			if (items.error) {
				vscode.window.showErrorMessage(items.error.message);
				return [];
			}

			const regexFilter = this.filterRegEx;

			for (let item of items.success) {
				if (regexFilter) {
					const match = item.displayName.match(regexFilter);
					if (!match) {
						ThisExtension.Logger.logInfo(`Skipping workspace ${item.displayName} because it does not match the workspace filter '${regexFilter}'.`);
						continue;
					}
				}
				if (item.capacityId || FabricConfiguration.showProWorkspaces) {
					let treeItem = new FabricWorkspace(item);
					children.push(treeItem);
				}
				else {
					ThisExtension.Logger.logInfo("Skipping workspace '" + item.displayName + "' (" + item.id + ") because it has no capacityId");
				}
			}

			return children;
		}
	}

	public get filterRegEx(): RegExp {
		if (this._filter) {
			return new RegExp(this._filter, "i");
		}
		if (FabricConfiguration.workspaceFilter) {
			return FabricConfiguration.workspaceFilterRegEx;
		}
		return undefined;
	}

	async filter(): Promise<void> {
		const currentFilter = this._filter;

		const filter = await vscode.window.showInputBox({
			title: "Filter Workspaces",
			prompt: "Enter a filter to apply to the workspaces. Regular Expressions (RegEx) are supported. Leave empty to clear the filter.",
			placeHolder: "Enter a filter to apply to the workspaces",
			value: currentFilter
		});

		if (filter === undefined) {
			return;
		}

		this._filter = filter;
		FabricConfiguration.workspaceFilter = filter;

		this.refresh(null, true);
	}
}
