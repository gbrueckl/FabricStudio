import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricApiTreeItem } from '../FabricApiTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceGenericFolder extends FabricWorkspaceTreeItem {
	protected _customApiUrlPart: string;
	protected _defaultChildCollapsibleState: vscode.TreeItemCollapsibleState;
	protected _children: FabricWorkspaceTreeItem[] = undefined;

	constructor(
		id: string,
		name: string,
		type: FabricApiItemType,
		parent: FabricWorkspaceTreeItem,
		apiUrlPart: string = undefined,
		defaultChildCollapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
	) {
		super(id, name, type, parent, undefined, undefined);

		this._customApiUrlPart = apiUrlPart;
		this._defaultChildCollapsibleState = defaultChildCollapsibleState;

		// the workspaceId is not unique for logical folders hence we make it unique
		this.id = this.workspaceId + "/" + parent.itemId + "/" + this.itemType.toString();
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

	get hasChildrenAdded(): boolean {
		return this._children != undefined && this._children.length > 0;
	}

	addChild(value: FabricWorkspaceTreeItem, parent: FabricWorkspaceTreeItem = this): void {
		if (this._children == undefined) {
			this._children = [];
		}
		value.parent = parent;
		this._children.push(value);
	}

	get defaultChildCollapsibleState(): vscode.TreeItemCollapsibleState {
		return this._defaultChildCollapsibleState;
	}

	set defaultChildCollapsibleState(value: vscode.TreeItemCollapsibleState) {
		this._defaultChildCollapsibleState = value;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];
		if (this._children) {
			children = this._children

			this._children = undefined;
		}
		else {
			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath);
				
				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				for (let item of items.success) {
					let treeItem = new FabricWorkspaceTreeItem(item.id, item.displayName, item.type, this, item, item.description, this._defaultChildCollapsibleState);
					children.push(treeItem);
				}
			}
			catch (e) {
				Helper.handleGetChildrenError(e, this.parent);
			}
		}

		children = Array.from(children.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

		return children;
	}
}