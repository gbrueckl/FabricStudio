import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';

export class FabricCapacityTreeItem extends FabricApiTreeItem {

	constructor(
		id: UniqueId,
		name: string,
		type: FabricApiItemType,
		parent: FabricCapacityTreeItem,
		definition: any = undefined,
		description: string = undefined,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
	) {
		super(id, name, type, parent, definition, description, collapsibleState);
	}

	get TreeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudiocapacities";
	}

	public get canDelete(): boolean {
		return false;
	}

	public async getChildren(element?: FabricCapacityTreeItem): Promise<FabricCapacityTreeItem[]> {
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}

	get parent(): FabricCapacityTreeItem {
		return super.parent as FabricCapacityTreeItem;
	}

	set parent(value: FabricCapacityTreeItem) {
		this._parent = value;
	}
}
