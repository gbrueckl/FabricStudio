import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricAppliedTag } from './FabricAppliedTag';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceTags extends FabricWorkspaceGenericFolder {
	constructor(
		parent: FabricWorkspaceTreeItem
	) {
		super(`${parent.itemId}/tags`, "Tags", "WorkspaceTags", parent, undefined, vscode.TreeItemCollapsibleState.Expanded);

		this.iconPath = new vscode.ThemeIcon('tag');
	}

	get apiPath(): string {
		return this.workspace.apiPath;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		let children: FabricWorkspaceTreeItem[] = [];

		if (this._children) {
			children = this._children;
			this._children = undefined;
			return children;
		}

		try {
			let workspaceDefinition = this.workspace.itemDefinition;

			// AIDEV-NOTE: Workspace tags are loaded from the detail endpoint because the list payload may not include them.
			if (!workspaceDefinition?.tags) {
				const workspace = await FabricApiService.get<iFabricApiWorkspace>(this.apiPath);

				if (workspace.error) {
					ThisExtension.Logger.logError(workspace.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(workspace.error)];
				}

				workspaceDefinition = workspace.success;
				this.workspace.itemDefinition = workspaceDefinition;
			}

			for (let tag of workspaceDefinition.tags || []) {
				children.push(new FabricAppliedTag(tag, "WorkspaceTag", this));
			}

			Helper.sortArrayByProperty(children, "label");
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.workspace, "workspace tags");
		}

		return children;
	}
}