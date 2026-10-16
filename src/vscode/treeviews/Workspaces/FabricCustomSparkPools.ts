import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

interface FabricCustomSparkPool {
	id: string;
	name: string;
}

const STARTER_POOL_ID = '00000000-0000-0000-0000-000000000000';

/** Workspace-scoped custom Spark pools exposed by the Spark REST API. */
export class FabricCustomSparkPools extends FabricWorkspaceGenericFolder {
	constructor(parent: FabricWorkspaceTreeItem) {
		super(`${parent.id}/CustomSparkPools`, 'Custom Spark Pools', 'CustomSparkPools', parent, 'spark/pools');
		this.iconPath = new vscode.ThemeIcon('server-process');
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null) {
			return element.getChildren();
		}

		try {
			const pools = await FabricApiService.getList<FabricCustomSparkPool>(this.apiPath, undefined, 'value', 'name');
			if (pools.error) {
				ThisExtension.Logger.logError(pools.error.message);
				return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(pools.error)];
			}

			return pools.success.filter(pool => pool.id !== STARTER_POOL_ID).map(pool => {
				const treeItem = new FabricWorkspaceGenericViewer(pool.name, this, pool.id, 'GenericViewer', true);
				treeItem.itemId = pool.id;
				treeItem.itemDefinition = pool;
				treeItem.description = pool.id;
				treeItem.tooltip = this.getToolTip(pool);
				return treeItem;
			});
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, 'custom Spark pools');
			return [];
		}
	}
}
