import * as vscode from 'vscode';

import { iFabricApiGatewayRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { FabricGateway } from './FabricGateway';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricGatewayRoleAssignment } from './FabricGatewayRoleAssignment';
import { Helper } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGatewayRoleAssignments extends FabricConnectionGenericFolder {
	constructor(
		parent: FabricGateway
	) {
		super(`${parent.id}/roleAssignments`, "Role Assignments", "GatewayRoleAssignments", parent, "roleAssignments");
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricGatewayRoleAssignment[] = [];

			try {
			let items = await FabricApiService.getList<iFabricApiGatewayRoleAssignment>(this.apiPath, undefined, "value", "id");

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricConnectionTreeItem.ERROR_ITEM<FabricConnectionTreeItem>(items.error)];
			}

			for (let item of items.success) {
				let treeItem = new FabricGatewayRoleAssignment(item, this);
				children.push(treeItem);
			}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "gateway role assignments");
			}

			return children;
		}
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

		const response = await FabricApiService.post(this.apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Gateway Role-Assignment for identity '${identity.principal.displayName}'`, 3000);
			}
		}
	}
}