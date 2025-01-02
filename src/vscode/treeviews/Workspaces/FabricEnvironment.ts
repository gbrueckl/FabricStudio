import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricEnvironment extends FabricItem {

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];

			children.push(new FabricWorkspaceGenericViewer("Staging Settings", this, "staging/sparkcompute"));
			children.push(new FabricWorkspaceGenericViewer("Published Settings", this, "sparkcompute"));
			children.push(new FabricWorkspaceGenericViewer("Staging Libraries", this, "staging/libraries"));
			children.push(new FabricWorkspaceGenericViewer("Published Libraries", this, "libraries"));

			return children;
		}
	}
}