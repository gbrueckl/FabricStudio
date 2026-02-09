import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemConnection } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricConnection } from '../Connections/FabricConnection';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemConnection extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemConnection,
		parent: FabricWorkspaceTreeItem
	) {
		// there might be connections without ID
		super(definition.id ?? definition.connectionDetails.path, parent, undefined, "ItemConnection");

		this.label = definition.displayName || definition.connectionDetails.path;
		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);
		this.description = this._description;

		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];

		return orig + actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.connectionDetails.type} - ${this.itemDefinition.connectivityType}`;
		}
	}

	getIcon() {
		if (this.itemDefinition) {
			return FabricConnection.getIconByConnectivityType(this.itemDefinition.connectivityType);
		}
	}

	get itemDefinition(): iFabricApiItemConnection {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemConnection) {
		this._itemDefinition = value;
	}

	// Item-specific functions
	get apiPath(): string {
		if (this.itemDefinition?.id) {
			return "/connections/" + this.itemDefinition.id;
		}
		return undefined;
	}
}