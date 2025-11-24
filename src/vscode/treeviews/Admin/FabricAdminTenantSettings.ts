import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminTenantSetting } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricAdminGenericFolder } from './FabricAdminGenericFolder';
import { FabricAdminTenantSetting } from './FabricAdminTenantSetting';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminTenantSettings extends FabricAdminGenericFolder {
	constructor() {
		super("TenantSettings", "Tenant Settings", "AdminTenantSettings", undefined, "admin/tenantsettings");
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricAdminTreeItem[] = [];
		let treeItem: FabricAdminGenericFolder;
		let itemTypes: Map<string, FabricAdminGenericFolder> = new Map<string, FabricAdminGenericFolder>();

		try {
			const items = await FabricApiService.getList<iFabricApiAdminTenantSetting>(this.apiPath, undefined, "value", "title");
			let itemToAdd: FabricAdminTenantSetting;

			const regexFilter = ThisExtension.TreeViewAdmin.filterRegEx;

			if (items.error) {
				ThisExtension.Logger.logError(items.error.message);
				return [FabricAdminTreeItem.ERROR_ITEM<FabricAdminTreeItem>(items.error)];
			}

			for (let item of items.success) {
				if (regexFilter) {
					const setting = JSON.stringify(item)
					const match = setting.match(regexFilter);
					if (!match) {
						ThisExtension.Logger.logInfo(`Skipping Admin Tenant Setting '${item.settingName}' because it does not match the Admin filter: ${regexFilter}`);
						continue;
					}
				}

				if (!itemTypes.has(item.tenantSettingGroup)) {
					treeItem = new FabricAdminGenericFolder(
						item.tenantSettingGroup,
						item.tenantSettingGroup,
						"AdminTenantSettings",
						undefined
					);
					itemTypes.set(item.tenantSettingGroup, treeItem);
				}

				let settingGroup = itemTypes.get(item.tenantSettingGroup);

				itemToAdd = new FabricAdminTenantSetting(item, settingGroup);

				settingGroup.addChild(itemToAdd);
			}

			children = Array.from(itemTypes.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

			children = FabricAdminTreeItem.handleEmptyItems(children, regexFilter);
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "admin tenant settings");
		}

		return children;
	}
}