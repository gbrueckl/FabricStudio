import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricApiItemType, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnectionGenericFolder extends FabricConnectionTreeItem {
	protected _customApiUrlPart: string;
	protected _defaultChildCollapsibleState: vscode.TreeItemCollapsibleState;
	protected _children: FabricConnectionTreeItem[];

	constructor(
		id: string,
		name: string,
		type: FabricApiItemType,
		parent: FabricConnectionTreeItem,
		apiUrlPart: string = undefined,
		defaultChildCollapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
	) {
		super(id, name, type, parent, undefined, name, vscode.TreeItemCollapsibleState.Collapsed);

		this._customApiUrlPart = apiUrlPart;
		this._defaultChildCollapsibleState = defaultChildCollapsibleState;

		this.iconPath = this.getIconPath();
	}

	public get canDelete(): boolean {
		return false;
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'genericfolder.svg');
	}

	// tooltip shown when hovering over the item
	get _tooltip(): string {
		return undefined;
	}

	// description is show next to the label
	get _description(): string {
		return undefined;
	}

	get apiUrlPart(): string {
		if (this._customApiUrlPart != undefined) {
			return this._customApiUrlPart;
		}
		return this.itemType;
	}

	addChild(value: FabricConnectionTreeItem) {
		if (!this._children) {
			this._children = [];
		}
		value.parent = this;
		this._children.push(value);
	}

	get defaultChildCollapsibleState(): vscode.TreeItemCollapsibleState {
		return this._defaultChildCollapsibleState;
	}

	set defaultChildCollapsibleState(value: vscode.TreeItemCollapsibleState) {
		this._defaultChildCollapsibleState = value;
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		let children: FabricConnectionTreeItem[] = [];
		if (this._children) {
			children = this._children
		}
		else {
			throw new Error("Not implemented");
			// try {
			// 	const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);

			// 	for (let item of items.success) {
			// 		let treeItem = new FabricConnectionTreeItem(item.id, item.displayName, item.type, this, item, item.description, this._defaultChildCollapsibleState);
			// 		children.push(treeItem);
			// 	}
			// }
			// catch (e) {
			// 	ThisExtension.Logger.logInfo("Could not load tables for lakehouse " + this.parent.itemName);
			// }
		}

		children = Array.from(children.values()).sort((a, b) => a.label.toString().localeCompare(b.label.toString()));

		return children;
	}
}