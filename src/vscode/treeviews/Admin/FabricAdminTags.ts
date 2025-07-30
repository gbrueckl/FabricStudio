import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminTag } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricAdminGenericFolder } from './FabricAdminGenericFolder';
import { FabricAdminTag } from './FabricAdminTag';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminTags extends FabricAdminGenericFolder {
	constructor() {
		super("Tags", "Tags", "AdminTags", undefined, "admin/tags");
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricAdminTreeItem[] = [];

		try {
			const items = await FabricApiService.getList<iFabricApiAdminTag>(this.apiPath, undefined, "value", "displayName");
			let itemToAdd: FabricAdminTag;

			const regexFilter = ThisExtension.TreeViewAdmin.filterRegEx;

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricAdminTreeItem.ERROR_ITEM<FabricAdminTreeItem>(items.error)];
			}

			for (let item of items.success) {
				if (regexFilter) {
					const tag = JSON.stringify(item)
					const match = tag.match(regexFilter);
					if (!match) {
						ThisExtension.Logger.logInfo(`Skipping Admin Tag '${item.displayName}' because it does not match the Admin filter: ${regexFilter}`);
						continue;
					}
				}

				itemToAdd = new FabricAdminTag(item, this);
				children.push(itemToAdd);
			}

			return FabricAdminTreeItem.handleEmptyItems<FabricAdminTreeItem>(children, regexFilter, "tag");
		}
		catch (error) {
			ThisExtension.Logger.logError(error.message);
			return [FabricAdminTreeItem.ERROR_ITEM<FabricAdminTreeItem>(error)];
		}
	}
}
