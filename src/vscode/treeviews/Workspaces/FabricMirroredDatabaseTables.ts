import * as vscode from 'vscode';


import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiTableMirroringStatusResponse } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricMirroredDatabase } from './FabricMirroredDatabase';
import { FabricMirroredDatabaseTable } from './FabricMirroredDatabaseTable';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricMirroredDatabaseTables extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricMirroredDatabase
	) {
		super(`${parent.itemId}/MirroredTables`, "Tables", "MirroredDatabaseTables", parent, "getTablesMirroringStatus");
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSE_IN_ONELAKE"];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricMirroredDatabaseTable[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiTableMirroringStatusResponse>(this.apiPath, undefined, "data", "sourceTableName");

				for (let item of items.success) {
					let treeItem = new FabricMirroredDatabaseTable(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load tables for MirroredDatabase " + this.parent.itemName);
			}

			return children;
		}
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const MirroredDatabase = this.getParentByType<FabricMirroredDatabase>("MirroredDatabase");
		
		return vscode.Uri.parse(`onelake://${workspace.itemId}/${MirroredDatabase.itemId}/Tables`);
	}
}