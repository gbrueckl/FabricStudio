import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWorkspaceRoleAssignment, iFabricApiWorkspaceRoleAssignmentRole } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceRoleAssignment extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiWorkspaceRoleAssignment,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.principal.displayName, parent, undefined, "WorkspaceRoleAssignment");

		this.id = parent.id + "/" + definition.id;
		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.description = this._description;
		this.contextValue = this._contextValue;

		this.iconPath = this.getIconPath();
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
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DELETE_ROLE_ASSIGNMENT",
			"UPDATE_ROLE_ASSIGNMENT"
		];

		return orig + actions.join(",") + ",";
	}

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

	// get canDelete(): boolean {
	// 	return false; 
	// }

	get itemDefinition(): iFabricApiWorkspaceRoleAssignment {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWorkspaceRoleAssignment) {
		this._itemDefinition = value;
	}

	get canDelete(): boolean {
		return true;
	}


	// properties of iFabricApiWorkspaceRoleAssignment
	async update(): Promise<void> {
		const availableRoles = Helper.getQuickPicksFromEnum(iFabricApiWorkspaceRoleAssignmentRole, this.itemDefinition.role);
		let role = await vscode.window.showQuickPick(availableRoles, {
			"title": "Select new Role",
			"placeHolder": this.itemDefinition.role.toString(),
			"canPickMany": false
		})

		if(!role) {
			ThisExtension.Logger.logWarning("No role selected. Aborting update of Role Assignment.");
			return;

		}
		const body = {
			"role": role.label
		};

		try {
			const result = await FabricApiService.awaitWithProgress("Updating Role Assignment", FabricApiService.patch(this.apiPath, body), 2000);

			if (result.success) {
				ThisExtension.Logger.logInfo(`Role Assignment for '${this.itemDefinition.principal.displayName}' in workspace '${this.workspace.itemName}' updated to '${role}'.`);
				ThisExtension.TreeViewWorkspaces.refresh(this.parent, false);
			}
			else {
				ThisExtension.Logger.logError(`Could not update Role Assignment '${this.itemDefinition.principal.displayName}' in workspace '${this.workspace.itemName}'`);
			}
		}
		catch (e) {
			ThisExtension.Logger.logError(e.message, true);
		}
	}
}