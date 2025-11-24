import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';

import { iFabricApiItemJobSchedule } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItem } from './FabricItem';
import { FabricItemJobSchedule } from './FabricItemJobSchedule';
import { FabricMapper } from '../../../fabric/FabricMapper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemJobSchedules extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricItem
	) {
		super(`${parent.id}/JobsSchedules`, "Schedules", "ItemJobSchedules", parent, `jobs/DefaultJob/schedules`);
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];

			if(this._children) {
				children = this._children;
				this._children = undefined;
				return children;
			}

			try {
				const items = await FabricApiService.getList<iFabricApiItemJobSchedule>(this.apiPath);

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricItemJobSchedule(item, this);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent, "job schedules");
			}

			return children;
		}
	}

	get apiPath(): string {
		return Helper.joinPath(this.parent.itemApiPath, this.apiUrlPart);
	}

	get jobType(): string {
		return FabricMapper.getItemTypeJobType(this.parent.itemType);
	}

	get apiUrlPart(): string {
		return `jobs/${this.jobType}/schedules`;
	}
}