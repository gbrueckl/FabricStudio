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
			"CREATE_RESTORE_POINT"
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
			prompt: "Enter a name for the Restore Point (optional)",
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

		const response = await FabricApiService.post(endpoint, body);

		if (response.error) {
			ThisExtension.Logger.logError(response.error.message, true, true);
		}
		else {
			// const msg = `Successfully created restore point '${displayName}' for ${response.success.creationDetails.eventDateTime}.`;
			const msg = `Successfully created restore point '${displayName}'.`;
			ThisExtension.Logger.logInfo(msg, 5000);
		}
	}
}