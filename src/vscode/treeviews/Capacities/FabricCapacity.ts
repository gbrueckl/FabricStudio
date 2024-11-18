import * as vscode from 'vscode';

import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { iFabricApiCapacity } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricCapacity extends FabricCapacityTreeItem {

	constructor(
		definition: iFabricApiCapacity,
		parent: FabricCapacityTreeItem
	) {
		super(definition.id, definition.displayName, "Capacity", parent, definition, definition.id, vscode.TreeItemCollapsibleState.None);
		
		this.description = `${definition.sku} | ${definition.region}`;

		if(definition.state == "Active") {
			this.iconPath = new vscode.ThemeIcon("gear~spin");
		}
		else {
			this.iconPath = new vscode.ThemeIcon("debug-pause");
		}
	}

	/* Overwritten properties from FabricCapacityTreeItem */
}