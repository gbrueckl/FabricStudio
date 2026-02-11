import * as vscode from 'vscode';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { iFabricApiConnection, iFabricApiConnectionRoleAssignment } from '../../../fabric/_types';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionRoleAssignments } from './FabricConnectionRoleAssignments';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnection extends FabricConnectionGenericFolder {

	constructor(
		definition: iFabricApiConnection,
		parent: FabricConnectionTreeItem
	) {
		super(definition.id, definition.displayName, "Connection", parent, "connections");
		this.itemDefinition = definition;

		this.tooltip = this.getToolTip(definition);
		this.iconPath = new vscode.ThemeIcon("extensions-remote");
		this.description = definition.id;
		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
	get apiPath(): string {
		return `v1/connections/${this.itemDefinition?.id ?? this.itemId}/`;
	}

	getIcon() {
		if (this.itemDefinition) {
			return FabricConnection.getIconByConnectivityType(this.itemDefinition.connectivityType);
		}
	}

	static getIconByConnectivityType(connectivityType: string): vscode.ThemeIcon {
		if (connectivityType) {
			if (connectivityType === "OnPremisesGatewayPersonal" || connectivityType === "OnPremisesGateway") {
				return new vscode.ThemeIcon("cloud-upload");
			}
			else if (connectivityType === "ShareableCloud") {
				return new vscode.ThemeIcon("issue-reopened");
			}
			else if (connectivityType === "PersonalCloud") {
				return new vscode.ThemeIcon("issue-draft");
			}
		}
		return new vscode.ThemeIcon("extensions-remote");
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		let children: FabricConnectionTreeItem[] = [];
		if (this._children) {
			children = this._children
		}

		// Role Assignments
		let roleAssignments = new FabricConnectionRoleAssignments(this);
		children.push(roleAssignments);

		children = Array.from(children.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

		return children;
	}

	async addRoleAssignment(identity: iFabricApiConnectionRoleAssignment, showInfoMessage: boolean = true): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/connections/add-connection-role-assignment?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/connections/f3a2e6af-d048-4f85-94d9-b3d16140df05/roleAssignments
		{
			"principal": {
				"id": "6a002b3d-e4ec-43df-8c08-e8eb7547d9dd",
				"type": "User"
			},
			"role": "Owner"
		}
		*/
		const apiPath = Helper.joinPath(this.apiPath, "roleAssignments");

		const response = await FabricApiService.post(apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Connection Role-Assignment for identity '${identity.principal.displayName || identity.principal.id}'`, 3000);
			}
		}
	}
}