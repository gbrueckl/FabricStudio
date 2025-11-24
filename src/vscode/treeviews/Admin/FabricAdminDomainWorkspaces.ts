import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminDomain, iFabricApiAdminDomainWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricAdminGenericFolder } from './FabricAdminGenericFolder';
import { FabricAdminDomainWorkspace } from './FabricAdminDomainWorkspace';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminDomainWorkspaces extends FabricAdminGenericFolder {

	constructor(
		parent: FabricAdminTreeItem
	) {
		super("DomainWorkspaces_" + parent.id, "Workspaces", "AdminDomainWorkspaces", parent, `workspaces`);
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricAdminTreeItem[] = [];

		try {
			const items = await FabricApiService.getList<iFabricApiAdminDomainWorkspace>(this.apiPath, undefined, "value", "name");
			let itemToAdd: FabricAdminDomainWorkspace;

			const regexFilter = ThisExtension.TreeViewAdmin.filterRegEx;

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricAdminTreeItem.ERROR_ITEM<FabricAdminTreeItem>(items.error)];
			}

			for (let item of items.success) {
				if (regexFilter) {
					const workspace = JSON.stringify(item)
					const match = workspace.match(regexFilter);
					if (!match) {
						ThisExtension.Logger.logInfo(`Skipping Admin Domain Workspace '${item.displayName}' because it does not match the Admin filter: ${regexFilter}`);
						continue;
					}
				}

				itemToAdd = new FabricAdminDomainWorkspace(item, this);
				children.push(itemToAdd);
			}

			children = children.sort((a, b) => a.itemName.localeCompare(b.itemName));

			children = FabricAdminTreeItem.handleEmptyItems(children, regexFilter);
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "domain workspaces");
		}

		return children;
	}
}
