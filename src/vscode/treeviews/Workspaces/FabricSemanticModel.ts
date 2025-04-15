import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { PowerBI } from '@utils/PowerBI';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricSemanticModel extends FabricItem {

	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.contextValue = this._contextValue;
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DOWNLOAD_PBIP"
		];

		return orig + actions.join(",") + ",";
	}

	async downloadPBIP(): Promise<void> {
		await PowerBI.downloadDatasetAsPBIP(this.itemId, this.workspaceId);
	}

	/* Overwritten properties from FabricApiTreeItem */
}