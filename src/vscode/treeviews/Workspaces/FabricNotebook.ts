import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricNotebook extends FabricItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"EDIT_DEFINITION"
		];

		return orig + actions.join(",") + ",";
	}

	static async runNotebook(notebook: FabricItem): Promise<void> {
		// https://learn.microsoft.com/en-us/fabric/data-engineering/notebook-public-api#run-a-notebook-on-demand

		const endpoint = Helper.joinPath(notebook.itemApiPath, "jobs/instances?jobType=RunNotebook");

		const body = {
			"executionData": {}
		}

		const response = await FabricApiService.post(endpoint, body, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Notebook job started for '${notebook.itemName}'. (Tracking: GET ${response.success.url})`, 10000);
		}
	}
}