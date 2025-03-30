import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiWorkspaceManagedPrivateEndpoint, iFabricApiWorkspaceRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceManagedPrivateEndpoint } from './FabricWorkspaceManagedPrivateEndpoint';
import { FabricApiTreeItem } from '../FabricApiTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceManagedPrivateEndpoints extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/managedPrivateEndpoints`, "Managed Private Endpoints", "WorkspaceManagedPrivateEndpoints", parent, "managedPrivateEndpoints");

		this.id = parent.itemId + "/" + this.itemType.toString();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceManagedPrivateEndpoint[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiWorkspaceManagedPrivateEndpoint>(this.apiPath, undefined, undefined, undefined);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricWorkspaceManagedPrivateEndpoint(item, this);
					children.push(treeItem);
				}

				Helper.sortArrayByProperty(children, "label");
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load Managed Private Endpoints for workspace " + this.workspace.itemName, true);
			}

			return children;
		}
	}

	// 
	async addRoleAssignment(identity: iFabricApiWorkspaceRoleAssignment, showInfoMessage: boolean = true): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/add-workspace-role-assignment?tabs=HTTP
		/*
POST https://api.fabric.microsoft.com/v1/workspaces/cfafbeb1-8037-4d0c-896e-a46fb27ff512/roleAssignments
{
	"principal": {
		"id": "8eedb1b0-3af8-4b17-8e7e-663e61e12211",
		"type": "User"
	},
	"role": "Member"
	}
*/

		const response = await FabricApiService.post(this.apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Workspace Role-Assignment for identity '${identity.principal.displayName}'`, 3000);
			}
		}
	}
}