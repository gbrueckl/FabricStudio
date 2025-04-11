import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricItem } from './FabricItem';
import { FabricCommandBuilder } from '../../input/FabricCommandBuilder';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricReport extends FabricItem {

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
		const pbipFileName = this.itemName + ".pbip";

		// QuickPick - live connection or with dataset
		const connModeQp = await FabricCommandBuilder.showQuickPick(
			[new FabricQuickPickItem("Live Connection"), new FabricQuickPickItem("Local Dataset")], 
			`How do you want to connect to the data?`, undefined, undefined);
		let connectionMode = connModeQp.value;

		
		// initialize Fabric FS for the report definition
		const items = await vscode.workspace.fs.readDirectory(this.resourceUri);

		// if "with dataset"
		// get dataset reference from pbir file - get dataset, build resource URI, copy from Fabric FS
	}

	/* Overwritten properties from FabricApiTreeItem */
}