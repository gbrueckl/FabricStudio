import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { Helper } from '@utils/Helper';
import { iFabricApiItem, iFabricApiLakehouse, iFabricApiWarehouse, iFabricApiWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricDragAndDropController } from '../../FabricDragAndDropController';
import { FabricItem } from './FabricItem';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricWarehouse } from './FabricWarehouse';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';
import { FabricDataPipeline } from './FabricDataPipeline';
import { FabricEnvironment } from './FabricEnvironment';
import { FabricGraphQLApi } from './FabricGraphQLApi';
import { FabricNotebook } from './FabricNotebook';
import { FabricMirroredDatabase } from './FabricMirroredDatabase';
import { FabricWorkspaceFolder } from './FabricWorkspaceFolder';
import { FabricReport } from './FabricReport';
import { FabricSemanticModel } from './FabricSemanticModel';
import { FabricSQLItem } from './FabricSQLItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricWorkspacesTreeProvider implements vscode.TreeDataProvider<FabricWorkspaceTreeItem> {

	private _filter: string;
	private _treeView: vscode.TreeView<FabricWorkspaceTreeItem>;
	private _onDidChangeTreeData: vscode.EventEmitter<FabricWorkspaceTreeItem | undefined> = new vscode.EventEmitter<FabricWorkspaceTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<FabricWorkspaceTreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView<FabricWorkspaceTreeItem>('FabricStudioWorkspaces', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: true,
			dragAndDropController: new FabricDragAndDropController()
		});
		this._treeView = view;
		this._filter = FabricConfiguration.workspaceFilter;
		context.subscriptions.push(view);

		view.onDidChangeSelection((event) => this._onDidChangeSelection(event.selection));

		ThisExtension.TreeViewWorkspaces = this;
	}

	private async _onDidChangeSelection(items: readonly FabricWorkspaceTreeItem[]): Promise<void> {
		let allow_delete: boolean = false;
		if (items.every((item) => item.canDelete)) {
			allow_delete = true;
		}

		vscode.commands.executeCommand(
				"setContext",
				"Fabric.Workspaces.allowDeleteItems",
				allow_delete
			);
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
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];
			const regexFilter = this.filterRegEx;

			let items = await FabricApiService.getList<iFabricApiWorkspace>("/v1/workspaces");

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
			}

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

			children = FabricWorkspaceTreeItem.handleEmptyItems(children, regexFilter);

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

	async deleteSelectedItems(): Promise<void> {

		const items: readonly FabricWorkspaceTreeItem[] = this.Selection;

		if (!items || items.length === 0) {
			vscode.window.showInformationMessage("No items selected for deletion.");
			return;
		}

		const delItems = await vscode.window.showQuickPick(items.map(item => item.asQuickPickItem), { canPickMany: true, placeHolder: "Select items to delete" });

		if (!delItems || delItems.length === 0) {
			vscode.window.showInformationMessage("No items selected for deletion.");
			return;
		}

		for (let delItem of delItems) {
			FabricWorkspaceTreeItem.delete("none", delItem.apiItem as FabricWorkspaceTreeItem); // we know it is a FabricApiTreeItem because FabricWorkspaceTreeItem extends it
		}

		this.refresh(null, true);
	}

	public static getFromApiDefinition(item: iFabricApiItem, parent: FabricWorkspaceTreeItem): FabricItem {
		// this method was placed here as it causes issues with circular dependencies in FabricWorkspaceTreeItem, FabricItem, etc.
		let itemToAdd: FabricItem;

		if (item.type == "Lakehouse") {
			itemToAdd = new FabricLakehouse(item as iFabricApiLakehouse, parent);
		}
		else if (item.type == "Warehouse") {
			itemToAdd = new FabricWarehouse(item as iFabricApiWarehouse, parent);
		}
		else if (item.type == "SQLEndpoint") {
			itemToAdd = new FabricSqlEndpoint(item, parent);
		}
		else if (item.type == "DataPipeline") {
			itemToAdd = new FabricDataPipeline(item, parent);
		}
		else if (item.type == "Environment") {
			itemToAdd = new FabricEnvironment(item, parent);
		}
		else if (item.type == "GraphQLApi") {
			itemToAdd = new FabricGraphQLApi(item, parent);
		}
		else if (item.type == "Notebook") {
			itemToAdd = new FabricNotebook(item, parent);
		}
		else if (item.type == "MirroredDatabase") {
			itemToAdd = new FabricMirroredDatabase(item, parent);
		}
		else if (item.type == "Report") {
			itemToAdd = new FabricReport(item, parent);
		}
		else if (item.type == "SemanticModel") {
			itemToAdd = new FabricSemanticModel(item, parent);
		}
		else if (item.type == "MirroredAzureDatabricksCatalog" 
			|| item.type == "SQLDatabase"
			|| item.type == "MirroredWarehouse") 
			{
			itemToAdd = new FabricSQLItem(item, parent);
		}
		else {
			itemToAdd = new FabricItem(item, parent);
		}

		if (parent instanceof FabricWorkspaceFolder) {
			itemToAdd.folderId = parent.folderId
		}

		return itemToAdd;
	}
}
