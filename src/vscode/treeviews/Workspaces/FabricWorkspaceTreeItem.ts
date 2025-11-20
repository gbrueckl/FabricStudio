import * as vscode from 'vscode';

import { ThisExtension, TreeProviderId } from '../../../ThisExtension';

import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricMapper } from '../../../fabric/FabricMapper';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
export class FabricWorkspaceTreeItem extends FabricApiTreeItem {
	protected _folderId: UniqueId;

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricWorkspaceTreeItem = undefined,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(id, name, type, parent, definition, description, collapsibleState);

		this.iconPath = this.getIconPath();
		this.resourceUri = this.fabricFsUri?.uri;
		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

		const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(this.itemType);
		if (FabricConfiguration.itemTypeHasDefinition(itemTypePlural)) {
			if (itemTypePlural == "SemanticModels") {
				actions.push("EDIT_TMDL")
			}
			else if (itemTypePlural == "Reports") {
				actions.push("EDIT_PBIR")
			}
			else {
				actions.push("EDIT_DEFINITION");
			}
		}

		// to dynamically show actions based on item type
		actions.push(this.itemType.toUpperCase());

		return orig + actions.join(",") + ",";
	}

	public async getChildren(element?: FabricApiTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	get treeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudioworkspaces";
	}

	async editItems(): Promise<void> {
		this.editDefinition();
	}

	get oneLakeUri(): vscode.Uri {
		return null;
	}

	get parent(): FabricWorkspaceTreeItem {
		return this._parent as FabricWorkspaceTreeItem;
	}

	set parent(value: FabricWorkspaceTreeItem) {
		this._parent = value;
	}

	get workspace(): FabricWorkspace {
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		return workspace;
	}

	get workspaceId(): UniqueId {
		return this.workspace.itemId;
	}

	get folderId(): UniqueId {
		return this._folderId;
	}

	set folderId(value: UniqueId) {
		this._folderId = value;
	}

	get asQuickPickItem(): FabricQuickPickItem {
		let qpItem = new FabricQuickPickItem(this.itemName, this.itemId, this.itemId);
		qpItem.apiItem = this;
		qpItem.itemType = this.itemType;
		qpItem.workspaceId = this.workspaceId;
		qpItem.workspaceName = this.workspace.itemName;

		return qpItem;
	}

	get canDelete(): boolean {
		return false;
	}

	get canMove(): boolean {
		return false;
	}


	get fabricFsUri(): FabricFSUri {
		if (this.itemType == "Workspace") {
			FabricFSUri.addWorkspaceNameIdMap(this.itemName, this.itemId);
			return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///workspaces/${this.itemId}`));
		}

		if (this.itemType == "WorkspaceFolder") {
			return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///workspaces/${this.workspaceId}`));
		}

		const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(this.itemType);
		let itemFsPath = Helper.trimChar(Helper.joinPath("workspaces", this.workspaceId, itemTypePlural, this.itemName), "/");

		// TODO: there is a bug if the item resides in a workspace folder
		FabricFSUri.addItemNameIdMap(this.itemName, this.itemId, this.workspaceId, this.itemType);
		const fabricFsUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///${itemFsPath}`));
		return fabricFsUri;

		//let itemFsPath = this.itemPath;
		// as we return the URI by name, we also have to add the item to the mapping
		if (Helper.isGuid(this.itemId)) {
			itemFsPath = Helper.trimChar(Helper.joinPath(this.itemPath.split("/").slice(1, -1).join("/"), this.itemName), "/");
			FabricFSUri.addItemNameIdMap(itemFsPath, this.itemId);
			itemFsPath = "workspaces/" + itemFsPath;
		}

		return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///${itemFsPath}`));
	}

	get fabricFsItemUri(): FabricFSUri {
		const itemTypePlural: FabricApiItemType = FabricMapper.getItemTypePlural(this.itemType);
		let itemFsPath = Helper.joinPath("workspaces", this.workspaceId, itemTypePlural, this.itemName);

		return new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}:///${itemFsPath}`));
	}

	public async editDefinition(): Promise<void> {
		const fabricUri = this.fabricFsUri;

		let workspace = "";
		if (this.itemType != "Workspace") {
			workspace = `${this.workspace.itemName} - `
		}

		let label = `Fabric - ${workspace}${this.itemName}`;

		await Helper.addToWorkspace(fabricUri.uri, label, true);
	}

	public static handleEmptyItems<FabricWorkspaceTreeItem>(items: FabricWorkspaceTreeItem[], filter: RegExp = undefined, itemType: string = "workspace"): FabricWorkspaceTreeItem[] {
		return super.handleEmptyItems<FabricWorkspaceTreeItem>(items, filter, itemType);
	}

	async rename(): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/items/update-item?tabs=HTTP
		/*
		PATCH https://api.fabric.microsoft.com/v1/workspaces/cfafbeb1-8037-4d0c-896e-a46fb27ff229/items/5b218778-e7a5-4d73-8187-f10824047715
		{
			"displayName": "Item's New name",
			"description": "Item's New description"
		}
		*/
		const newName = await vscode.window.showInputBox({
			title: `Rename ${this.itemType}`,
			ignoreFocusOut: true,
			prompt: `Enter new name for ${this.itemType} '${this.itemName}'`,
			placeHolder: this.itemName,
			value: this.itemName
		});
		if (!newName) {
			ThisExtension.Logger.logError("No name for rename provided, aborting operation.", true);
			return undefined;
		}
		let body = {
			"displayName": newName,
		};

		const response = await FabricApiService.patch(this.apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully renamed ${this.itemType} '${this.itemName}' to '${newName}'!`, 3000);
		}

		ThisExtension.TreeViewWorkspaces.refresh(this.parent, false);
	}
}