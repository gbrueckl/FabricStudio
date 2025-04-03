import * as vscode from 'vscode';

import { iFabricApiConnection, iFabricApiGateway } from '../../../fabric/_types';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricGatewayMembers } from './FabricGatewayMembers';
import { FabricGatewayRoleAssignments } from './FabricGatewayRoleAssignments';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGateway extends FabricConnectionGenericFolder {

	constructor(
		definition: iFabricApiConnection, 
		gateway?: iFabricApiGateway
	) {
		super(definition.gatewayId, gateway?.displayName ?? definition.gatewayId ?? definition.connectivityType, "Gateway", undefined, definition.gatewayId, vscode.TreeItemCollapsibleState.Collapsed);
		this.itemDefinition = definition ?? gateway;

		this.description = definition.gatewayId ?? definition.connectivityType;
		this.tooltip = this.getToolTip(definition);
		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricConnectionGenericFolder */
	protected getIcon(): vscode.Uri | vscode.ThemeIcon {
		if (this.itemDefinition.connectivityType === "OnPremisesGatewayPersonal") {
			return new vscode.ThemeIcon("cloud-upload");
		}
		if (this.itemDefinition.connectivityType === "OnPremisesGateway") {
			return new vscode.ThemeIcon("cloud-upload");
		}
		else {
			return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'genericfolder.svg');
		}
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
		return "gateways/" + this.itemId;
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		let children: FabricConnectionTreeItem[] = [];
		if (this._children) {
			children = this._children
		}
		//else {
			// Members
			try {
				let members = new FabricGatewayMembers(this);
				const connectionsChildren = await FabricApiTreeItem.getValidChildren(members);			
				if (connectionsChildren.length > 0) {
					children.push(members);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load members for gateway " + this.itemName);
			}

			// Role Assignments
			try {
				let roleAssignments = new FabricGatewayRoleAssignments(this);
				const roleAssignmentsChildren = await FabricApiTreeItem.getValidChildren(roleAssignments);			
				if (roleAssignmentsChildren.length > 0) {
					children.push(roleAssignments);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load roleAssignments for item " + this.itemName, true);
			}
		//}

		children = Array.from(children.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

		return children;
	}
}