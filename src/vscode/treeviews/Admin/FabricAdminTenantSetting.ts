import * as vscode from 'vscode';

import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { iFabricApiAdminTenantSetting, iFabricApiWorkspace } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';
import { FabricAdminGenericViewer } from './FabricAdminGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminTenantSetting extends FabricAdminGenericViewer {

	constructor(
		definition: iFabricApiAdminTenantSetting,
		parent: FabricAdminTreeItem
	) {
		super(definition.title, parent, "AdminTenantSetting");

		if (definition.enabled) {
			this.iconPath = new vscode.ThemeIcon("check");
		}
		else {
			this.iconPath = new vscode.ThemeIcon("close");
		}

		this.itemDefinition = definition;
		this.description = definition.settingName
	}

	public get canDelete(): boolean {
		return false;
	}

	public get apiUrlPart(): string {
		return this.itemDefinition.settingName
	}

	/* Overwritten properties from FabricAdminTreeItem */
}