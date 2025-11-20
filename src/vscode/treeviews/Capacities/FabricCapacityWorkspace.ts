import * as vscode from 'vscode';

import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { FabricApiWorkspaceType, iFabricApiCapacity, iFabricApiWorkspace } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricCapacityWorkspace extends FabricCapacityTreeItem {

	constructor(
		definition: iFabricApiWorkspace,
		parent: FabricCapacityTreeItem
	) {
		super(definition.id, definition.displayName, "CapacityWorkspace", parent, definition, definition.id, vscode.TreeItemCollapsibleState.None);

		this.id = parent.id + "/" + definition.id;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = this.getIconPath();
	}

	protected getIconPath(): string | vscode.Uri {
		if (this.workspaceType == FabricApiWorkspaceType.Personal) {
			return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'myworkspace.svg');
		}
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'workspace.svg');
	}

	get capacityId(): string {
		return this.itemDefinition?.capacityId;
	}

	get workspaceType(): FabricApiWorkspaceType {
		return FabricApiWorkspaceType[this.itemDefinition.type];
	}

	get itemDefinition(): iFabricApiWorkspace {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWorkspace) {
		this._itemDefinition = value;
	}

	public get canDelete(): boolean {
		return false;
	}

	/* Overwritten properties from FabricCapacityTreeItem */
	public async getChildren(element?: FabricCapacityTreeItem): Promise<FabricCapacityTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

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