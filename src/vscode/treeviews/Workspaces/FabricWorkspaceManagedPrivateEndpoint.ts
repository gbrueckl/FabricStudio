import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWorkspaceManagedPrivateEndpoint } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceManagedPrivateEndpoint extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiWorkspaceManagedPrivateEndpoint,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.name, parent, undefined, "WorkspaceManagedPrivateEndpoint");

		this.id = parent.id + "/" + definition.id;
		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.description = this._description;
		this.contextValue = this._contextValue;

		this.iconPath = new vscode.ThemeIcon("broadcast");
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"DELETE",
		];

		return orig + actions.join(",") + ",";
	}

	get _description(): string {
		return this.itemDefinition?.targetSubresourceType;
	}

	get itemDefinition(): iFabricApiWorkspaceManagedPrivateEndpoint {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWorkspaceManagedPrivateEndpoint) {
		this._itemDefinition = value;
	}


	// properties of iFabricApiWorkspaceManagedPrivateEndpoint
}