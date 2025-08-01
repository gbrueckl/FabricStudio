import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiAdminDomain } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricAdminDomainWorkspaces } from './FabricAdminDomainWorkspaces';
import { Helper } from '@utils/Helper';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminDomain extends FabricAdminTreeItem {
	constructor(
		domain: iFabricApiAdminDomain,
		parent: FabricAdminTreeItem
	) {
		super(domain.id, domain.displayName, "AdminDomain", parent, domain, domain.description);

		this.iconPath = new vscode.ThemeIcon("terminal-ubuntu")
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	}


	public get canDelete(): boolean {
		return true;
	}

	public get canRename(): boolean {
		return true;
	}

	async getChildren(element?: FabricAdminTreeItem): Promise<FabricAdminTreeItem[]> {
		let children: FabricAdminTreeItem[] = [];

		children.push(new FabricAdminDomainWorkspaces(this));

		return children;
	}
}
