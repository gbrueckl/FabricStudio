import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiItemType,  iFabricApiItemShortcut,  iFabricApiLakehouseTable } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricLakehouseTable } from './FabricLakehouseTable';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricItemShortcut } from './FabricItemShortcut';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemShortcuts extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/Shortcuts`, "Shortcuts", "ItemShortcuts", parent, "shortcuts");
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSE_IN_ONELAKE"];

		return orig + actions.join(",") + ",";
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricItemShortcut[] = [];

			try {
				const items = await FabricApiService.getList<iFabricApiItemShortcut>(this.apiPath, undefined, undefined, "name");

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricItemShortcut(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load shortcuts for item " + this.parent.itemName, true);
			}

			return children;
		}
	}

	get apiPath(): string {
		return Helper.joinPath(this.parent.itemApiPath, this.apiUrlPart);
	}
}