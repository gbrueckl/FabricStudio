import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminDomain } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricAdminGenericFolder } from './FabricAdminGenericFolder';
import { FabricAdminDomain } from './FabricAdminDomain';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminDomains extends FabricAdminGenericFolder {
	constructor() {
		super("Domains", "Domains", "AdminDomains", undefined, "admin/domains");
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricAdminTreeItem[] = [];

		try {
			const items = await FabricApiService.getList<iFabricApiAdminDomain>(this.apiPath, undefined, "domains", "displayName");
			let itemToAdd: FabricAdminDomain;

			const regexFilter = ThisExtension.TreeViewAdmin.filterRegEx;

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricAdminTreeItem.ERROR_ITEM<FabricAdminTreeItem>(items.error)];
			}

			for (let item of items.success) {
				if (regexFilter) {
					const domain = JSON.stringify(item)
					const match = domain.match(regexFilter);
					if (!match) {
						ThisExtension.Logger.logInfo(`Skipping Admin Domain '${item.displayName}' because it does not match the Admin filter: ${regexFilter}`);
						continue;
					}
				}

				itemToAdd = new FabricAdminDomain(item, this);
				children.push(itemToAdd);
			}

			children = children.sort((a, b) => a.itemName.localeCompare(b.itemName));

			children = FabricAdminTreeItem.handleEmptyItems(children, regexFilter, "AdminDomain");
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "admin domains");
		}

		return children;
	}
}
