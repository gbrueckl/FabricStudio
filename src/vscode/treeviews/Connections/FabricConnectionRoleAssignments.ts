import * as vscode from 'vscode';

import { iFabricApiConnectionRoleAssignment, iFabricApiGatewayRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { FabricGateway } from './FabricGateway';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricGatewayRoleAssignment } from './FabricGatewayRoleAssignment';
import { FabricConnection } from './FabricConnection';
import { FabricConnectionRoleAssignment } from './FabricConnectionRoleAssignment';
import { Helper } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnectionRoleAssignments extends FabricConnectionGenericFolder {
	constructor(
		parent: FabricConnection
	) {
		super(`${parent.id}/roleAssignments`, "Role Assignments", "ConnectionRoleAssignments", parent, "roleAssignments");
	}

	get apiPath(): string {
		return Helper.joinPath(this.parent.apiPath, "roleAssignments");
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricConnectionRoleAssignment[] = [];
			let items = await FabricApiService.getList<iFabricApiConnectionRoleAssignment>(this.apiPath, undefined, "value", "id");

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricConnectionTreeItem.ERROR_ITEM<FabricConnectionTreeItem>(items.error)];
			}
			
			for (let item of items.success) {
				let treeItem = new FabricConnectionRoleAssignment(item, this);
				children.push(treeItem);
			}

			return children;
		}
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

		const response = await FabricApiService.post(this.apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Connection Role-Assignment for identity '${identity.principal.displayName}'`, 3000);
			}
		}
	}
}