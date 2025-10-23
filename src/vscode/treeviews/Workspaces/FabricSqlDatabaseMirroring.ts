import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlDatabaseMirroring extends FabricWorkspaceTreeItem {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(parent.id + "/Mirroring", "Mirroring", "SqlDatabaseMirroring", parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

		// all settings are done by updateMirroringStatus() which must be called after initialization due to its async nature
	}

	get apiUrlPart(): string {
		return "getMirroringStatus";
	}

	/* Overwritten properties from FabricApiTreeItem */
	async updateMirroringStatus(): Promise<void> {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"UPDATE_MIRRORING_STATUS"
		];

		const currentStatus = await this.getMirroringStatus();
		if(currentStatus == "Stopped") {
			this.iconPath = new vscode.ThemeIcon("sync-ignored");
			actions.push("START_SQL_MIRRORING");
		}
		else if(currentStatus == "Running") {
			this.iconPath = new vscode.ThemeIcon("sync~spin");
			actions.push("STOP_SQL_MIRRORING");
		}
		else {
			this.iconPath = new vscode.ThemeIcon("question");
		}

		this.description = currentStatus;
		this.contextValue = orig + actions.join(",") + ",";
	}

	async getMirroringStatus(): Promise<string> {
		return "UNKNOWN"; // currently not implemented as there is no API for it

		//POST https://api.fabric.microsoft.com/v1/workspaces/6e335e92-a2a2-4b5a-970a-bd6a89fbb765/mirroredDatabases/cfafbeb1-8037-4d0c-896e-a46fb27ff229/getMirroringStatus
		const endpoint = Helper.joinPath(this.apiPath)

		const response = await FabricApiService.post(endpoint, undefined);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			return response.success.status
		}
	}

	async startMirroring(): Promise<void> {
		const endpoint = Helper.joinPath(...this.apiPath.split("/").slice(undefined, -2), "startMirroring")

		const response = await FabricApiService.post(endpoint, undefined);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Starting mirroring for database ${this.itemName}.`, 10000);
		}

		ThisExtension.TreeViewWorkspaces.refresh(this.parent);
	}

	async stopMirroring(): Promise<void> {
		const endpoint = Helper.joinPath(...this.apiPath.split("/").slice(undefined, -2), "stopMirroring")

		const response = await FabricApiService.post(endpoint, undefined);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Stopping mirroring for database ${this.itemName}.`, 10000);
		}

		ThisExtension.TreeViewWorkspaces.refresh(this.parent);
	}
}