import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWarehouse } from '../../../fabric/_types';
import { FabricSQLItem } from './FabricSQLItem';
import { FabricWarehouseRestorePoints } from './FabricWarehouseRestorePoints';
import { Helper } from '@utils/Helper';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouse extends FabricSQLItem {
	constructor(
		definition: iFabricApiWarehouse,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition, parent);

		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"CREATE_RESTORE_POINT",
			"CREATE_SNAPSHOT"
		];

		return orig + actions.join(",") + ",";
	}


	get itemDefinition(): iFabricApiWarehouse {
		return <iFabricApiWarehouse>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWarehouse) {
		this._itemDefinition = value;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children.push(new FabricWarehouseRestorePoints(this));

		children = children.concat(await super.getChildren());

		return children;
	}

	public async createRestorePoint(): Promise<void> {
		const endpoint = Helper.joinPath(this.apiPath, "restorePoints");

		const displayName = await vscode.window.showInputBox({
			prompt: "Enter a name for the Restore Point",
			placeHolder: "My Restore Point",
			ignoreFocusOut: true
		});

		if(!displayName) {
			vscode.window.showInformationMessage("Restore Point creation cancelled.");
			return;
		}

		const body = {
			"displayName": displayName
		}

		const response = await FabricApiService.awaitWithProgress(`Creating restore point '${displayName}'`, FabricApiService.post(endpoint, body));
	}

	public async createSnapshot(): Promise<void> {
		const endpoint = Helper.joinPath(this.workspace.apiPath, "warehousesnapshots");

		const displayName = await vscode.window.showInputBox({
			prompt: "Enter a name for the Snapshot",
			placeHolder: "My Snapshot",
			ignoreFocusOut: true
		});

		if(!displayName) {
			vscode.window.showInformationMessage("Snapshot creation cancelled.");
			return;
		}

		const snapshotTime = await vscode.window.showInputBox({
			prompt: "Enter a time for the Snapshot",
			placeHolder: "YYYY-MM-DDTHH:mm:ss.sssZ",
			value: new Date().toISOString(),
			ignoreFocusOut: true
		});

		if(!snapshotTime) {
			vscode.window.showInformationMessage("Snapshot creation cancelled.");
			return;
		}

		const body = {
			"displayName": displayName,
			"creationPayload": {
				"parentWarehouseId": this.itemId,
				"snapshotDateTime": snapshotTime
			}
		}

		const response = await FabricApiService.awaitWithProgress(`Creating snapshot '${displayName}'`, FabricApiService.post(endpoint, body));
	}
}