import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceGenericFolder extends FabricWorkspaceTreeItem {
	private _customApiUrlPart: string;
	private _children: FabricWorkspaceTreeItem[];

	constructor(
		id: string,
		name: string,
		type: FabricApiItemType,
		parent: FabricWorkspaceTreeItem,
		apiUrlPart: string = undefined

	) {
		super(id, name, type, parent, undefined, undefined);

		this._customApiUrlPart = apiUrlPart;
		// the workspaceId is not unique for logical folders hence we make it unique
		this.id = this.workspaceId + "/" + parent.itemId + "/" + this.itemType.toString();
		this.iconPath = this.getIconPath();
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'genericfolder.svg');
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
		if(this._customApiUrlPart != undefined) {
			return this._customApiUrlPart;
		}
		return this.itemType;
	}

	addChild(value: FabricWorkspaceTreeItem) {
		if(!this._children) {
			this._children = [];
		}
		value.parent = this;
		this._children.push(value);
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if(this._children) {
			return this._children;
		}
		await vscode.window.showErrorMessage("getChildren is not implemented! Please overwrite in derived class!");
		return undefined;
	}
}