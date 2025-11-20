import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { ThisExtension, TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';
import { iGenericApiError } from '@utils/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';

export class FabricAdminTreeItem extends FabricApiTreeItem {

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricAdminTreeItem,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(id, name, type, parent, definition, description, collapsibleState);

		this.description = this._description;
	}

	get treeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudioadmin";
	}

		// description is show next to the label
	get _description(): string {
		return `${this.itemId}`;
	}

	public get canDelete(): boolean {
		return false;
	}

	public async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	get parent(): FabricAdminTreeItem {
		return super.parent as FabricAdminTreeItem;
	}

	set parent(value: FabricAdminTreeItem) {
		this._parent = value;
	}

	public static handleEmptyItems<FabricAdminTreeItem>(items: FabricAdminTreeItem[], filter: RegExp = undefined, itemType: string = "item"): FabricAdminTreeItem[] {
		return super.handleEmptyItems<FabricAdminTreeItem>(items, filter, itemType);
	}

	public async checkboxChanged(newState: vscode.TreeItemCheckboxState): Promise<void> {
	}
}
