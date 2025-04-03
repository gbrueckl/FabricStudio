import * as vscode from 'vscode';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { iFabricApiConnection } from '../../../fabric/_types';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionRoleAssignments } from './FabricConnectionRoleAssignments';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';

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
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
	get apiPath(): string {
		return `v1/connections/${this.itemDefinition.id}/`;
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
			let children: FabricConnectionTreeItem[] = [];
			if (this._children) {
				children = this._children
			}
	
			// Role Assignments
			try {
				let roleAssignments = new FabricConnectionRoleAssignments(this);
				const roleAssignmentsChildren = await FabricApiTreeItem.getValidChildren(roleAssignments);	
				if (roleAssignmentsChildren.length > 0) {
					children.push(roleAssignments);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load roleAssignments for connection " + this.itemName);
			}
	
			children = Array.from(children.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
	
			return children;
		}
}