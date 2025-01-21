import * as vscode from 'vscode';

import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { ThisExtension, TreeProviderId } from '../../../ThisExtension';
import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricCommandBuilder } from '../../input/FabricCommandBuilder';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';
import { FabricMapper } from '../../../fabric/FabricMapper';

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

	public async editDefinition(): Promise<void> {
		const fabricUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}://${this.itemPath}`));

		let workspace = "";
		if (this.itemType != "Workspace") {
			workspace = `${this.workspace.itemName} - `
		}

		let label = `Fabric - ${workspace}${this.itemName}`;

		await Helper.addToWorkspace(fabricUri.uri, label, true);
	}

	public async delete(confirmation: "yesNo" | "name" | undefined = undefined): Promise<void> {

		if (confirmation) {
			let confirm: string;
			switch (confirmation) {
				case "yesNo":
					confirm = await FabricCommandBuilder.showQuickPick([new FabricQuickPickItem("yes"), new FabricQuickPickItem("no")], `Do you really want to delete ${this.itemType.toLowerCase()} '${this.itemName}'?`, undefined, undefined);
					break;
				case "name":
					confirm = await FabricCommandBuilder.showInputBox("", `Confirm deletion by typeing the ${this.itemType.toLowerCase()} name '${this.itemName}' again.`, undefined, undefined);
					break;
			}

			if (!confirm
				|| (confirmation == "name" && confirm != this.itemName)
				|| (confirmation == "yesNo" && confirm != "yes")) {
				const abortMsg = `Deletion of ${this.itemType.toLowerCase()} '${this.itemName}' aborted!`
				ThisExtension.Logger.logWarning(abortMsg);
				Helper.showTemporaryInformationMessage(abortMsg, 2000)
				return;
			}
		}

		const response = await FabricCommandBuilder.execute<any>(this.apiPath, "DELETE", []);
		if (response.error) {
			const errorMsg = response.error.message;
			vscode.window.showErrorMessage(errorMsg);
		}
		else {
			const successMsg = `${this.itemType.toLowerCase()} '${this.itemName}' deleted!`
			Helper.showTemporaryInformationMessage(successMsg, 2000);

			if (this.parent) {
				ThisExtension.refreshTreeView(this.TreeProvider, this.parent);
			}
		}
	}
}