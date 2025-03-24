import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricAdminTenantSettings } from './FabricAdminTenantSettings';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricAdminTreeProvider implements vscode.TreeDataProvider<FabricAdminTreeItem> {

	private _treeView: vscode.TreeView<FabricAdminTreeItem>;
	private _previousSelection: { item: FabricAdminTreeItem, time: number };
	private _onDidChangeTreeData: vscode.EventEmitter<FabricAdminTreeItem | undefined> = new vscode.EventEmitter<FabricAdminTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricAdminTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricAdminTreeItem>('FabricStudioAdmin', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewAdmin = this;
	}

	private async _onDidChangeSelection(items: readonly FabricAdminTreeItem[]): Promise<void> {
	}

	public get Selection(): readonly FabricAdminTreeItem[] {
		return this._treeView.selection;
	}

	async refresh(tree_item: FabricAdminTreeItem = null, showInfoMessage: boolean = false): Promise<void> {
		// we always refresh the whole tree as its all built upon one API call
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: FabricAdminTreeItem): FabricAdminTreeItem {
		return element;
	}

	getParent(element: FabricAdminTreeItem): vscode.ProviderResult<FabricAdminTreeItem> {
		return element.parent;
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricAdminTreeItem[] = [];

		children.push(new FabricAdminTenantSettings());

		return children;
	}


	async filter(): Promise<void> {
		const currentFilter = FabricConfiguration.adminFilter;

		const filter = await vscode.window.showInputBox({
			title: "Filter Admin Setting",
			prompt: "Enter a filter to apply to the Admin Settings. All properties will be considered for the search. Regular Expressions (RegEx) are supported. Leave empty to clear the filter.",
			placeHolder: "Enter a filter to apply to the Admin  Settings",
			value: currentFilter
		});

		if (filter === undefined) {
			return;
		}

		FabricConfiguration.adminFilter = filter;

		this.refresh(null, true);
	}
}
