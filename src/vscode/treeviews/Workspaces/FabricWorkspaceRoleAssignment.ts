import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiWorkspaceRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItem } from './FabricItem';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceRoleAssignment extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiWorkspaceRoleAssignment,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.principal.displayName, "WorkspaceRoleAssignment", parent, definition, "", vscode.TreeItemCollapsibleState.None);

		this.label = definition.principal.displayName;
		this.description = this._description;

		this.iconPath = {
			light: this.getIconPath(),
			dark: this.getIconPath()
		};
	}

	protected getIconPath(): string | vscode.Uri {
		if (this.itemDefinition?.principal) {
			if (this.itemDefinition.principal.type == "User") {
				return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'permissionuser.png');
			}
			else if (this.itemDefinition.principal.type == "Group") {
				return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'permissiongroup.png');
			}
			else {
				return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'permissionapp.png');
			}
		}
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _description(): string {
		if (this.itemDefinition?.principal) {
			let desc = this.itemDefinition.role;
			if (this.itemDefinition.principal.type == "User") {
				return desc + " - " + this.itemDefinition.principal.userDetails.userPrincipalName;
			}
			else if (this.itemDefinition.principal.type == "ServicePrincipal") {
				return desc + " - AppID: " + this.itemDefinition.principal.servicePrincipalDetails.aadAppId;
			}
			else {
				return desc + " - ObjectID: " + this.itemDefinition.id;
			}
		}
	}

	get itemDefinition(): iFabricApiWorkspaceRoleAssignment {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWorkspaceRoleAssignment) {
		this._itemDefinition = value;
	}


	// properties of iFabricApiWorkspaceRoleAssignment
	async delete(): Promise<void> {
		try {
			const result = await FabricApiService.awaitWithProgress("Deleting Role Assignment", FabricApiService.delete(this.apiPath, undefined));

			if (result.success) {
				ThisExtension.Logger.logInfo(`Role Assignment '${this.itemId}' deleted from workspace '${this.workspace.itemName}'`);
			}
			else {
				ThisExtension.Logger.logError(`Could not delete Role Assignment '${this.itemId}' from workspace '${this.workspace.itemName}'`);
			}
		}
		catch (e) {
			ThisExtension.Logger.logError(e.message);
		}
	}
}