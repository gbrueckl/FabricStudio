import * as vscode from 'vscode';

import { iFabricApiGatewayRoleAssignment, iFabricApiGatewayRoleAssignmentRole } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';
import { FabricGatewayRoleAssignments } from './FabricGatewayRoleAssignments';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGatewayRoleAssignment extends FabricConnectionGenericViewer {

	constructor(
		definition: iFabricApiGatewayRoleAssignment,
		parent: FabricGatewayRoleAssignments
	) {
		super(definition.id, parent, definition.id);
		this.itemDefinition = definition;
		this.itemId = definition.id;

		this.description = this._description;
		this.contextValue = this._contextValue;

		this.iconPath = this.getIconPath();

		this.itemType = "GatewayRoleAssignment";
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"UPDATE_GATEWAY_ROLE_ASSIGNMENT"
		];

		return orig + actions.join(",") + ",";
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

	get _description(): string {
		if (this.itemDefinition?.principal) {
			let desc = this.itemDefinition.role;
			if (this.itemDefinition.principal.type == "User") {
				return desc + " - " + this.itemDefinition.principal.id;
			}
			else if (this.itemDefinition.principal.type == "ServicePrincipal") {
				return desc + " - AppID: " + this.itemDefinition.principal.id;
			}
			else {
				return desc + " - ObjectID: " + this.itemDefinition.principal.id;
			}
		}
	}

	get itemDefinition(): iFabricApiGatewayRoleAssignment {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiGatewayRoleAssignment) {
		this._itemDefinition = value;
	}

	get canDelete(): boolean {
		return true;
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
	get apiPath(): string {
		return Helper.joinPath(this.parent.apiPath, this.itemId);
	}

	async update(): Promise<void> {
		const availableRoles = Helper.getQuickPicksFromEnum(iFabricApiGatewayRoleAssignmentRole, this.itemDefinition.role);
		const role = await vscode.window.showQuickPick(availableRoles, {
			"title": "Select new Role",
			"placeHolder": this.itemDefinition.role.toString(),
			"canPickMany": false
		});

		if (!role) {
			ThisExtension.Logger.logWarning("No role selected. Aborting update of Role Assignment.");
			return;
		}

		const body = {
			"role": role.label
		};

		try {
			const result = await FabricApiService.awaitWithProgress("Updating Role Assignment", FabricApiService.patch(this.apiPath, body), 2000);
			const principal = this.itemDefinition.principal.displayName || this.itemDefinition.principal.id;

			if (result.success) {
				ThisExtension.Logger.logInfo(`Role Assignment for '${principal}' in gateway '${this.parent.parent.itemName}' updated to '${role.label}'.`);
				ThisExtension.TreeViewConnections.refresh(this.parent, false);
			}
			else {
				ThisExtension.Logger.logError(`Could not update Role Assignment '${principal}' in gateway '${this.parent.parent.itemName}'`);
			}
		}
		catch (e) {
			ThisExtension.Logger.logError(e.message, true);
		}
	}
}
