import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiItemType,  iFabricApiItemShortcut,  iFabricApiLakehouseTable } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricLakehouseTable } from './FabricLakehouseTable';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricItemShortcut } from './FabricItemShortcut';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemShortcuts extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.workspaceId}/${parent.itemId}/Lakehouses`, "Shortcuts", "ItemShortcuts", parent, "shortcuts");
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
			let children: FabricItemShortcut[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItemShortcut>(this.apiPath, undefined, undefined, "name");

				for (let item of items.success) {
					let treeItem = new FabricItemShortcut(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load shortcuts for item " + this.parent.itemName);
			}

			return children;
		}
	}

	get apiPath(): string {
		let genericItemPathItems = this.parent.apiPath.split("/")
		genericItemPathItems[genericItemPathItems.length - 3] = "items";
		return genericItemPathItems.join("/") + "/shortcuts/";
	}

	// get oneLakeUri(): vscode.Uri {
	// 	// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
	// 	const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		
	// 	return vscode.Uri.parse(`onelake://${workspace.itemId}/${this.parent.itemId}/Tables`);
	// }
}