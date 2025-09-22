import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWarehouse, iFabricApiWarehouseSnapshot } from '../../../fabric/_types';
import { FabricSQLItem } from './FabricSQLItem';
import { FabricWarehouseRestorePoints } from './FabricWarehouseRestorePoints';
import { Helper } from '@utils/Helper';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';
import { FabricItem } from './FabricItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouseSnapshot extends FabricItem {
	constructor(
		definition: iFabricApiWarehouseSnapshot,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.itemDefinition = definition;
		this.label = this.label + " (SNAPSHOT)";

		this.iconPath = this.getIconPath();
	}

	/* Overwritten properties from FabricApiTreeItem */
	protected getIconPath(): string | vscode.Uri {
		return Helper.getIconPath("Warehouse");
	}

	get itemDefinition(): iFabricApiWarehouseSnapshot {
		return <iFabricApiWarehouseSnapshot>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWarehouseSnapshot) {
		this._itemDefinition = value;
	}
}