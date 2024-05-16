import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiItemType,  iFabricApiLakehouseTable } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricLakehouseTable } from './FabricLakehouseTable';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricLakehouse } from './FabricLakehouse';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricLakehouseTables extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricLakehouse
	) {
		super(`${parent.workspaceId}/${parent.itemId}/Lakehouses`, "LakehouseTables", "LakehouseTables", parent, "tables");
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSEONELAKE"];

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricLakehouseTable[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiLakehouseTable>(this.apiPath, undefined, "data");

				for (let item of items.success) {
					let treeItem = new FabricLakehouseTable(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load tables for lakehouse " + this.parent.itemName);
			}

			return children;
		}
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const lakehouse = this.getParentByType<FabricWorkspace>("Lakehouse");
		
		return vscode.Uri.parse(`onelake://${workspace.itemName}/${lakehouse.itemName}.Lakehouse/Tables`);
	}
}