import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

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
import { FabricApiTreeItem } from '../FabricApiTreeItem';


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
		this.itemName = definition.displayName;

		this.iconPath = this.getIconPath();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"CREATE_FOLDER"
		];

		return orig + actions.join(",") + ",";
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'genericfolder.svg');
	}

	get canDelete(): boolean {
		return true;
	}

	get canRename(): boolean {
		return true;
	}

	get itemDefinition(): iFabricApiWorkspaceFolder {
		return this._itemDefinition;
	}

	get apiUrlPart(): string {
		return ""
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
				Helper.handleGetChildrenError(e, this);
			}
		}

		children = Array.from(children.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

		children = FabricWorkspaceTreeItem.handleEmptyItems(children, undefined, "items");

		return children;
	}

	static async moveToFolder(sourceFolder: iFabricApiWorkspaceFolder, targetFolder?: iFabricApiWorkspaceFolder): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/folders/move-folder?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb/folders/dddddddd-9999-0000-1111-eeeeeeeeeeee/move
		{
			"targetFolderId": "cccccccc-8888-9999-0000-dddddddddddd"
		}
		*/

		const apiPath = `v1/workspaces/${sourceFolder.workspaceId}/folders/${sourceFolder.id}/move`;
		let body = {};
		if (targetFolder) {
			body = { "targetFolderId": targetFolder.id };
		}
		const response = await FabricApiService.post(apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully moved Folder '${sourceFolder.displayName}' to Folder '${targetFolder.displayName}'!`, 3000);
		}
	}

	static async createFolder(parent: FabricWorkspaceTreeItem): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/folders/create-folder?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb/folders
		{
			"displayName": "Q3",
			"parentFolderId": "bbbbbbbb-1111-2222-3333-cccccccccccc"
		}
		*/
		const newName = await vscode.window.showInputBox({
				title: `Create new Folder`,
				ignoreFocusOut: true,
				prompt: `Enter name for new Folder`,
				placeHolder: `My New Folder`,
				value: `My New Folder`
			});
			if (!newName) {
				ThisExtension.Logger.logError("No name for new folder provided, aborting publish operation.", true);
				return undefined;
			}
		const apiPath = `v1/workspaces/${parent.workspaceId}/folders`;
		let body = {
			"displayName": newName,
		};
		if (parent.itemType == "WorkspaceFolder") {
			body["parentFolderId"] = parent.id;
		}
		const response = await FabricApiService.post(apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully created Folder '${newName}' under '${parent.label}'!`, 3000);
		}

		ThisExtension.TreeViewWorkspaces.refresh(parent, false);
	}
}