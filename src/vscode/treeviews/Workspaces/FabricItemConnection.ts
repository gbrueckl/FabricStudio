import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType, iFabricApiItem, iFabricApiItemConnection } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemConnection extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemConnection,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.displayName, parent);

		this.itemId = definition.id;
		this.itemDefinition = definition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

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
			return `${this.itemDefinition.connectionDetails.path}`;
		}
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("extensions-remote");
	}

	get itemDefinition(): iFabricApiItemConnection {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemConnection) {
		this._itemDefinition = value;
	}

	// Item-specific functions
	get apiPath(): string {
		return "/connections/" + this.itemDefinition.id;
	}
}