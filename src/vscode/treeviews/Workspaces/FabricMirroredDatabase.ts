import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem, iFabricApiLakehouseProperties } from '../../../fabric/_types';
import { FabricMirroredDatabaseTables } from './FabricMirroredDatabaseTables';
import { FabricMirroredDatabaseSynchronization } from './FabricMirroredDatabaseSynchronization';
import { FabricSQLItem } from './FabricSQLItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricMirroredDatabase extends FabricSQLItem {

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);
	}

	/* Overwritten properties from FabricApiTreeItem */


	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = await super.getChildren();

		let synchronization = new FabricMirroredDatabaseSynchronization(this);
		await synchronization.updateMirroringStatus()
		children.push(synchronization);

		children.push(new FabricMirroredDatabaseTables(this));

		return children;
	}
}