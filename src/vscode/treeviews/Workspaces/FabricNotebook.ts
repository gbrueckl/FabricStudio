import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricNotebook extends FabricItem {
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

	static async runNotebook(notebook: FabricItem): Promise<void> {
		// https://learn.microsoft.com/en-us/fabric/data-engineering/notebook-public-api#run-a-notebook-on-demand

		const endpoint = Helper.joinPath(notebook.itemApiPath, "jobs/instances?jobType=RunNotebook");

		const body = {
			"executionData": {}
		}

		const response = await FabricApiService.post(endpoint, body, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			ThisExtension.Logger.logError(`Notebook job failed for '${notebook.itemName}': ${response.error.message}`, true);
		}
		else {
			ThisExtension.Logger.logInfo(`Notebook job started for '${notebook.itemName}'. (Tracking: GET ${response.success.url})`, 5000);
		}
	}
}


export interface FabricNotebook extends FabricItemLivyMixin { }
applyMixins(FabricNotebook, [FabricItemLivyMixin]);