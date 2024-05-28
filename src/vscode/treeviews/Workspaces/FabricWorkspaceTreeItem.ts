import * as vscode from 'vscode';

import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';

export class FabricWorkspaceTreeItem extends FabricApiTreeItem {
	
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
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

		const configItemFormats = FabricConfiguration.itemTypeFormats.map((x) => `${x.itemType}`);
		const itemTypePlural = this.itemType + (this.itemType.endsWith("s") ? "" : "s");
		if(configItemFormats.includes(itemTypePlural)) {
			actions.push("EDIT_DEFINITION");
		}

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

	public async editDefinition(): Promise<void> {
		const fabricUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}://${this.itemPath}`));

		await Helper.addToWorkspace(fabricUri.uri, `Fabric - Workspace ${this.itemName}`, true);
	}
}