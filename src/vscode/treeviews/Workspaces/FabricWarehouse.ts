import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWarehouse } from '../../../fabric/_types';
import { FabricSQLItem } from './FabricSQLItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouse extends FabricSQLItem {
	constructor(
		definition: iFabricApiWarehouse,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.itemDefinition = definition;
		this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get itemDefinition(): iFabricApiWarehouse {
		return <iFabricApiWarehouse>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWarehouse) {
		this._itemDefinition = value;
	}
}