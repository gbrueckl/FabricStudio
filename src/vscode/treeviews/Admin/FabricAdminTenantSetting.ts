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
			this.iconPath = undefined; //new vscode.ThemeIcon("check");
			this.checkboxState = vscode.TreeItemCheckboxState.Checked;
		}
		else {
			this.iconPath = undefined; //new vscode.ThemeIcon("close");
			this.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
		}

		this.itemDefinition = definition;
		this.description = definition.settingName
	}

	public get canDelete(): boolean {
		return false;
	}

	public get apiUrlPart(): string {
		if (this.itemDefinition?.settingName) {
			return this.itemDefinition.settingName
		}
		return super.apiUrlPart;
	}

	/* Overwritten properties from FabricAdminTreeItem */
	public async checkboxChanged(newState: vscode.TreeItemCheckboxState): Promise<void> {
		ThisExtension.Logger.logError(`It is currently not supported to change Tenant Settings via the UI!`, true, true);
		// this.checkboxState = newState;
		// this.itemDefinition.enabled = (newState === vscode.TreeItemCheckboxState.Checked);
		// await FabricApiService.updateTenantSetting(this.itemDefinition);
	}
}