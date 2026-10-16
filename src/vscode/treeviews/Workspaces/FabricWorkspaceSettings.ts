import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceRoleAssignments } from './FabricWorkspaceRoleAssignments';
import { FabricWorkspaceManagedPrivateEndpoints } from './FabricWorkspaceManagedPrivateEndpoints';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricWorkspaceTags } from './FabricWorkspaceTags';
import { FabricWorkspaceRecoverableItems } from './FabricWorkspaceRecoverableItems';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';

// A dedicated container node under a workspace for workspace-scoped settings
export class FabricWorkspaceSettings extends FabricWorkspaceGenericFolder {
    constructor(parent: FabricWorkspaceTreeItem) {
        super(`${parent.itemId}/workspaceSettings`, "Workspace Settings", "WorkspaceSettings", parent, undefined, vscode.TreeItemCollapsibleState.Collapsed);

        this.iconPath = new vscode.ThemeIcon('gear');
    }

	// need to override to prevent appending api path segment which would be done automatically for everything ending with 's' like 'workspaceSettings'
	get apiUrlPart(): string {
		return undefined;
	}

    async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
        if (element != null && element != undefined) {
            return element.getChildren();
        }
        else {
            try {
                const children: FabricWorkspaceTreeItem[] = [];

                children.push(new FabricWorkspaceRecoverableItems(this));
                children.push(new FabricWorkspaceTags(this));
                children.push(new FabricWorkspaceRoleAssignments(this));
                children.push(new FabricWorkspaceManagedPrivateEndpoints(this));
                children.push(await this.getChildItemLivySessions(this, "spark/livySessions"));
                children.push(new FabricWorkspaceGenericViewer("Spark Settings", this, "spark/settings", "GenericViewer", true));
                children.push(new FabricWorkspaceGenericViewer("OneLake Settings", this, "onelake/settings", "GenericViewer", true));
                children.push(new FabricWorkspaceGenericViewer("SQL Pools Configuration", this, "warehouses/sqlPoolsConfiguration", "GenericViewer", true));

                return children;
            }
            catch (e) {
                // reuse generic error handling where appropriate
                ThisExtension.Logger.logError(`Could not load Workspace Settings for ${this.workspace.itemName}: ${e}`);
                return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(e)];
            }
        }
    }
}

export interface FabricWorkspaceSettings extends FabricItemLivyMixin {}
applyMixins(FabricWorkspaceSettings, [FabricItemLivyMixin]);