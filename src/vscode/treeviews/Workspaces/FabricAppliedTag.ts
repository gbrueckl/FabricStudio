import * as vscode from 'vscode';

import { iFabricApiAppliedTag } from '../../../fabric/_types';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAppliedTag extends FabricWorkspaceTreeItem {
	constructor(
		tag: iFabricApiAppliedTag,
		itemType: "ItemTag" | "WorkspaceTag",
		parent: FabricWorkspaceTreeItem
	) {
		super(tag.id, tag.displayName, itemType, parent, tag, undefined, vscode.TreeItemCollapsibleState.None);

		this.contextValue = "";
		this.iconPath = new vscode.ThemeIcon('tag');
	}

	get supportsUri(): boolean {
		return false;
	}

	get itemDefinition(): iFabricApiAppliedTag {
		return this._itemDefinition as iFabricApiAppliedTag;
	}

	set itemDefinition(value: iFabricApiAppliedTag) {
		this._itemDefinition = value;
	}

	public get canOpenInBrowser(): boolean {
		return false;
	}

	public get canDelete(): boolean {
		return false;
	}

	public get canRename(): boolean {
		return false;
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