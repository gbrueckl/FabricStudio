import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';
import { iFabricApiAdminTag } from '../../../fabric/_types';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminTag extends FabricAdminTreeItem {
	constructor(
		tag: iFabricApiAdminTag,
		parent: FabricAdminTreeItem
	) {
		super(tag.id, tag.displayName, "AdminTag", parent, tag);

		this.contextValue = this._contextValue;
		this.iconPath = new vscode.ThemeIcon('tag');
		this.collapsibleState = vscode.TreeItemCollapsibleState.None;
	}

	get itemDefinition(): iFabricApiAdminTag {
		return this._itemDefinition as iFabricApiAdminTag;
	}

	set itemDefinition(value: iFabricApiAdminTag) {
		this._itemDefinition = value;
	}

	public get canDelete(): boolean {
		return true;
	}

	public get canRename(): boolean {
		return true;
	}
}
