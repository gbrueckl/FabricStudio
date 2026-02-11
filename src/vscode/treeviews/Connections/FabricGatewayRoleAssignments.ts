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
}