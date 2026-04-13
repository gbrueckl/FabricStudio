import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiRecoverableItem, iFabricApiResponse } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricRecoverableItem extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiRecoverableItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.displayName, "RecoverableItem", parent, definition, definition.deletedDateTime, vscode.TreeItemCollapsibleState.None);

		this.contextValue = this._contextValue;
		this.iconPath = new vscode.ThemeIcon('trash');
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"RECOVER",
			"DELETE_PERMANENTLY"
		];

		return orig + actions.join(",") + ",";
	}

	get supportsUri(): boolean {
		return false;
	}

	public get canOpenInBrowser(): boolean {
		return false;
	}

	public get canDelete(): boolean {
		// we use a dedicated "permanente delete" action for recoverable items, so we disable the default delete action
		return false;
	}

	get canRename(): boolean {
		return false;
	}

	get itemDefinition(): iFabricApiRecoverableItem {
		return this._itemDefinition as iFabricApiRecoverableItem;
	}

	set itemDefinition(value: iFabricApiRecoverableItem) {
		this._itemDefinition = value;
	}

	public async recover(): Promise<void> {
		const endpoint = Helper.joinPath(this.apiPath, "recover");

		const result = await FabricApiService.awaitWithProgress(
			`Recovering item '${this.itemName}'`,
			FabricApiService.post(endpoint, {}),
			3000
		);

		if (!result?.error) {
			ThisExtension.TreeViewWorkspaces.refresh(this.parent, false, true);
		}
	}

	get refreshedBy(): FabricWorkspaceTreeItem {
		// also refresh the workspace where the item was recovered to
		return this.parent.parent;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		return [];
	}
}
