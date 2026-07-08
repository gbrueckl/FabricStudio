import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemLivyMixin } from './mixins/FabricItemLivyMixin';
import { applyMixins } from './mixins/FabricMixin';
import { FabricSQLItem } from './FabricSQLItem';
import { FabricSqlDatabaseMirroring } from './FabricSqlDatabaseMirroring';
import { FabricItemOneLake } from './FabricItemOneLake';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAzureDatabricksStorage extends FabricItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children = children.concat(await super.getChildren());

		let onelake = new FabricItemOneLake(this);
		children.push(onelake);

		return children;
	}

	get oneLakeUri(): vscode.Uri {
		return vscode.Uri.parse(`${this.workspace.oneLakeUri}/${this.itemId}`);
	}
}