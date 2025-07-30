import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminDomain, iFabricApiAdminDomainWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminDomainWorkspace extends FabricAdminTreeItem {

	protected _workspace: iFabricApiAdminDomainWorkspace;

	constructor(
		workspace: iFabricApiAdminDomainWorkspace,
		parent: FabricAdminTreeItem
	) {
		super(workspace.id, workspace.displayName, "AdminDomainWorkspace", parent, workspace);

		this.collapsibleState = vscode.TreeItemCollapsibleState.None;

		this.iconPath = this.getIconPath();
	}

	protected getIconPath(): string | vscode.Uri {
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'workspace.svg');
	}

	get itemDefinition(): iFabricApiAdminDomainWorkspace {
		return this._itemDefinition as iFabricApiAdminDomainWorkspace;
	}

	set itemDefinition(value: iFabricApiAdminDomainWorkspace) {
		this._itemDefinition = value;
	}
}
