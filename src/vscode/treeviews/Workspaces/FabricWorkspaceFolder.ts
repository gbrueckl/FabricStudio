import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem, iFabricApiWorkspaceFolder } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItem } from './FabricItem';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricSqlEndpoint } from './FabricSqlEndpoint';
import { FabricDataPipeline } from './FabricDataPipeline';
import { FabricEnvironment } from './FabricEnvironment';
import { FabricGraphQLApi } from './FabricGraphQLApi';
import { FabricNotebook } from './FabricNotebook';
import { FabricMirroredDatabase } from './FabricMirroredDatabase';
import { FabricWorkspacesTreeProvider } from './FabricWorkspacesTreeProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceFolder extends FabricWorkspaceTreeItem {
	protected _customApiUrlPart: string;
	protected _children: FabricWorkspaceTreeItem[];

	constructor(
		id: string,
		name: string,
		definition: iFabricApiWorkspaceFolder,
		parent: FabricWorkspaceTreeItem,
		apiUrlPart: string = undefined,
	) {
		super(id, name, "WorkspaceFolder", parent, definition, undefined, vscode.TreeItemCollapsibleState.Collapsed);

		this._customApiUrlPart = apiUrlPart;

		this.iconPath = this.getIconPath();
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'genericfolder.svg');
	}

	get itemDefinition(): iFabricApiWorkspaceFolder {
		return this._itemDefinition;
	}

	get apiUrlPart(): string {
		return "";
	}

	addChild(value: FabricWorkspaceTreeItem) {
		if (!this._children) {
			this._children = [];
		}
		value.parent = this;
		this._children.push(value);
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			try {
				const workspace = this.workspace;
				const params = {
					"rootFolderId": this.itemId,
					"recursive": false,
				}
				const items = await FabricApiService.getList<iFabricApiItem>(workspace.apiPath + "items", params);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				let treeFolders: FabricWorkspaceFolder[] = [];
				const treeFolderDefs = this.workspace.workspaceFolders.filter((folder) => folder.parentFolderId == this.itemId);
				for (let folder of treeFolderDefs) {
					let treeItem = new FabricWorkspaceFolder(folder.id, folder.displayName, folder, this);
					treeFolders.push(treeItem);
				}
				children = Array.from(treeFolders.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

				let treeItems: FabricWorkspaceTreeItem[] = [];
				for (let item of items.success) {
					if (item.folderId != this.itemId) {
						continue;
					}

					let itemToAdd = FabricWorkspacesTreeProvider.getFromApiDefinition(item, this);
					treeItems.push(itemToAdd);
				}
				treeItems = Array.from(treeItems.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

				children = children.concat(treeItems);	
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load items for folder " + this.itemDefinition.displayName, true);
			}
		}

		children = Array.from(children.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

		return children;

	}
}