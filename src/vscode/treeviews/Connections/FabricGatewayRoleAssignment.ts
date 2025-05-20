import * as vscode from 'vscode';

import { iFabricApiGatewayRoleAssignment } from '../../../fabric/_types';
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

		this.description = this._description;
		this.contextValue = this._contextValue;

		this.iconPath = this.getIconPath();

		this.itemType = "GatewayRoleAssignment";
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			// "DELETE",
			// "UPDATE"
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
}