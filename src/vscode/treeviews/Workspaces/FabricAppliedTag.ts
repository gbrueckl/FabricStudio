import * as vscode from 'vscode';

import { iFabricApiResponse, iFabricApiTag } from '../../../fabric/_types';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAppliedTag extends FabricWorkspaceTreeItem {
	constructor(
		tag: iFabricApiTag,
		itemType: "ItemTag" | "WorkspaceTag",
		parent: FabricWorkspaceTreeItem
	) {
		super(tag.id, tag.displayName, itemType, parent, tag, undefined, vscode.TreeItemCollapsibleState.None);

		this.iconPath = new vscode.ThemeIcon('tag');
	}

	get supportsUri(): boolean {
		return false;
	}

	get itemDefinition(): iFabricApiTag {
		return this._itemDefinition as iFabricApiTag;
	}

	set itemDefinition(value: iFabricApiTag) {
		this._itemDefinition = value;
	}

	public get canOpenInBrowser(): boolean {
		return false;
	}

	public get canDelete(): boolean {
		return true;
	}

	public async delete(): Promise<iFabricApiResponse<any>> {
		let apiPath = Helper.joinPath(this.workspace.apiPath, "unapplyTags");
		if(this.parent.parent.contextValue.includes("FABRIC_ITEM")) {
			apiPath = Helper.joinPath((this.parent.parent as FabricItem).itemApiPath, "unapplyTags");
		}
		
		const body = {
			tags: [this.itemId]
		};
		const response = await FabricApiService.post<any>(apiPath, body);
		return response;
	}

	public get canRename(): boolean {
		return false;
	}

	get refreshedBy(): FabricWorkspaceTreeItem {
		return this.parent.parent;
	}

	get apiUrlPart(): string {
		return undefined;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	public getBrowserLink(): vscode.Uri {
		return this.parent.getBrowserLink();
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		return [];
	}
}