import * as vscode from 'vscode';

import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { iFabricApiCapacity, iFabricApiWorkspace } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricCapacity extends FabricCapacityTreeItem {

	constructor(
		definition: iFabricApiCapacity,
		parent: FabricCapacityTreeItem
	) {
		super(definition.id, definition.displayName, "Capacity", parent, definition, definition.id, vscode.TreeItemCollapsibleState.None);

		this.description = `${definition.sku} | ${definition.region} | ${definition.id}`;

		if (definition.state == "Active") {
			this.iconPath = new vscode.ThemeIcon("gear~spin");
		}
		else {
			this.iconPath = new vscode.ThemeIcon("debug-pause");
		}
	}

	public get canDelete(): boolean {
		return false;
	}

	/* Overwritten properties from FabricCapacityTreeItem */
	static async assignWorkspace(workspace: iFabricApiWorkspace, capacity: iFabricApiCapacity): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/assign-to-capacity?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/workspaces/cfafbeb1-8037-4d0c-896e-a46fb27ff512/assignToCapacity
		{
			"capacityId": "0f084df7-c13d-451b-af5f-ed0c466403b2"
		}
		*/

		const apiPath = `v1/workspaces/${workspace.id}/assignToCapacity`;
		const body = { "capacityId": capacity.id };
		const response = await FabricApiService.post(apiPath, body);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Successfully assigned Workspace '${workspace.displayName}' to Capacity '${capacity.displayName}'!`, 3000);
		}
	}

}