import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';
import { FabricSQLItem } from './FabricSQLItem';
import { FabricSqlDatabaseMirroring } from './FabricSqlDatabaseMirroring';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSqlDatabase extends FabricSQLItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children = children.concat(await super.getChildren());

		let synchronization = new FabricSqlDatabaseMirroring(this);
		await synchronization.updateMirroringStatus();
		children.push(synchronization);

		return children;
	}

	static async startMirroring(sqlDatabase: FabricItem): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/sqldatabase/mirroring/start-mirroring?tabs=HTTP

		const endpoint = sqlDatabase.apiPath + "startMirroring";
		const response = await FabricApiService.post(endpoint, {}, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Mirroring started for SQL database '${sqlDatabase.itemName}'. (Tracking: GET ${response.success.url})`, 10000);
		}
	}

	static async stopMirroring(sqlDatabase: FabricItem): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/sqldatabase/mirroring/stop-mirroring?tabs=HTTP

		const endpoint = sqlDatabase.apiPath + "stopMirroring";
		const response = await FabricApiService.post(endpoint, {}, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Mirroring stopped for SQL database '${sqlDatabase.itemName}'. (Tracking: GET ${response.success.url})`, 10000);
		}
	}
}