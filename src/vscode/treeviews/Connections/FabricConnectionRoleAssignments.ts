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

			try {
				let items = await FabricApiService.getList<iFabricApiConnectionRoleAssignment>(this.apiPath, undefined, "value", "id");

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricConnectionTreeItem.ERROR_ITEM<FabricConnectionTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricConnectionRoleAssignment(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "connection role-assignments");
			}

			return children;
		}
	}
}