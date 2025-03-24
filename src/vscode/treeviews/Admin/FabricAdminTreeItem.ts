import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';


import { FabricApiTreeItem } from '../FabricApiTreeItem';
import { TreeProviderId } from '../../../ThisExtension';
import { FabricApiItemType } from '../../../fabric/_types';

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
	}

	get TreeProvider(): TreeProviderId {
		return "application/vnd.code.tree.fabricstudioadmin";
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

	get apiUrlPart(): string {
		return "admin";
	}
}
