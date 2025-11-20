import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';
import { iGenericApiError } from '@utils/_types';

export class FabricConnectionTreeItem extends FabricApiTreeItem {

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricConnectionTreeItem,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(id, name, type, parent, definition, description, collapsibleState);
	}

	get treeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudioconnections";
	}

	public get canDelete(): boolean {
		return false;
	}

	public async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	get parent(): FabricConnectionTreeItem {
		return super.parent as FabricConnectionTreeItem;
	}

	set parent(value: FabricConnectionTreeItem) {
		this._parent = value;
	}

	public static handleEmptyItems<FabricConnectionTreeItem>(items: FabricConnectionTreeItem[], filter: RegExp = undefined): FabricConnectionTreeItem[] {
		return super.handleEmptyItems<FabricConnectionTreeItem>(items, filter, "connection");
	}
}
