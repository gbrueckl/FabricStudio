import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiItem, iFabricApiWorkspaceRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricGraphQLApi } from './FabricGraphQLApi';
import { FabricWorkspaceRoleAssignment } from './FabricWorkspaceRoleAssignment';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceRoleAssignments extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/Role Assignments`, "Role Assignments", "WorkspaceRoleAssignments", parent, "roleAssignments");

		this.id = parent.itemId + "/" + this.itemType.toString();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceRoleAssignment[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiWorkspaceRoleAssignment>(this.apiPath, undefined, undefined, undefined);

				for (let item of items.success) {
					let treeItem = new FabricWorkspaceRoleAssignment(item, this);
					children.push(treeItem);
				}

				Helper.sortArrayByProperty(children, "label");
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load Role Assignments for workspace " + this.workspace.itemName);
			}

			return children;
		}
	}
}