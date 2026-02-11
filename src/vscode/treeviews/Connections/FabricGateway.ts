import * as vscode from 'vscode';

import { iFabricApiConnection, iFabricApiGateway, iFabricApiGatewayRoleAssignment } from '../../../fabric/_types';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricGatewayMembers } from './FabricGatewayMembers';
import { FabricGatewayRoleAssignments } from './FabricGatewayRoleAssignments';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGateway extends FabricConnectionGenericFolder {
	constructor(
		definition: iFabricApiGateway,
	) {
		super(definition.id, definition.displayName, "Gateway", undefined, definition.id, vscode.TreeItemCollapsibleState.Collapsed);
		this.itemDefinition = definition;

		this.description = definition.displayName
		this.tooltip = this.getToolTip(definition);
		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricConnectionGenericFolder */
	protected getIcon(): vscode.Uri | vscode.ThemeIcon {
		return new vscode.ThemeIcon("cloud-upload");
	}

	protected getToolTip(definition: any) {
		if (!definition) return undefined;

		const keysToRemove: string[] = ["credentialDetails", "connectionDetails", "id"];

		const gatewayDefinition = Object.assign({}, ...Object.keys(definition)
			.filter(key => !keysToRemove.includes(key))
			.map(key => ({ [key]: definition[key] })));

		return super.getToolTip(gatewayDefinition)
	}

	get apiUrlPart(): string {
		if (this.itemId) {
			return "gateways/" + this.itemId;
		}
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		let children: FabricConnectionTreeItem[] = [];
		if (this._children) {
			children = this._children
		}

		// Members
		let members = new FabricGatewayMembers(this);
		children.push(members);

		// Role Assignments
		let roleAssignments = new FabricGatewayRoleAssignments(this);
		children.push(roleAssignments);


		children = Array.from(children.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

		return children;
	}

	async addRoleAssignment(identity: iFabricApiGatewayRoleAssignment, showInfoMessage: boolean = true): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/gateways/add-gateway-role-assignment?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/gateways/d12d139f-4141-467c-9f53-80787b198843/roleAssignments
		{
			"principal": {
				"id": "6a002b3d-e4ec-43df-8c08-e8eb7547d9dd",
				"type": "User"
			},
			"role": "ConnectionCreator"
		}
		*/

		const apiPath = Helper.joinPath(this.apiPath, "roleAssignments");

		const response = await FabricApiService.post(apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Gateway Role-Assignment for identity '${identity.principal.displayName || identity.principal.id}'`, 3000);
			}
		}
	}
}