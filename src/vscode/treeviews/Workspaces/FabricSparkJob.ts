import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSparkJob extends FabricItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);
	}

	/* Overwritten properties from FabricApiTreeItem */

	
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children = children.concat(await super.getChildren());

		children.push(await this.getChildItemLivySessions(this));

		return children;
	}

	static async runSparkJob(sparkJob: FabricItem): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/sparkjobdefinition/background-jobs/run-on-demand-spark-job-definition?tabs=HTTP

		const endpoint = sparkJob.apiPath + "jobs/instances?jobType=sparkjob";

		const body = {
			"executionData": {}
		}

		const response = await FabricApiService.post(endpoint, body, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			Helper.showTemporaryInformationMessage(`Spark job started for '${sparkJob.itemName}'. (Tracking: GET ${response.success.url})`, 10000);
		}
	}
}


export interface FabricSparkJob extends FabricItemLivyMixin { }
applyMixins(FabricSparkJob, [FabricItemLivyMixin]);