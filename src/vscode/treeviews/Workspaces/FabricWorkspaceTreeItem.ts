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

	get TreeProvider(): TreeProviderId {
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
		let qpItem = new FabricQuickPickItem(this.itemName, this.itemId, this.itemId, `\tWorkspace: ${this.workspace.itemName} - ${this.workspaceId}`);
		qpItem.apiItem = this;

		return qpItem;
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

	public static get NO_ITEMS(): FabricWorkspaceTreeItem {
		let item = new FabricWorkspaceTreeItem("NO_ITEMS", "No workspaces found!", "Workspace", undefined, undefined, undefined, vscode.TreeItemCollapsibleState.None);
		item.contextValue = "";
		return item;
	}

	public static handleEmptyItems<FabricWorkspaceTreeItem>(items: FabricWorkspaceTreeItem[], filter: RegExp = undefined): FabricWorkspaceTreeItem[] {
		return super.handleEmptyItems<FabricWorkspaceTreeItem>(items, filter, "workspace");
	}
}