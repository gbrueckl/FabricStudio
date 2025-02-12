import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemConnection, iFabricApiItemDataAccessRole } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricItemDataAccessRoles } from './FabricItemDataAccessRoles';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDataAccessRole extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemDataAccessRole,
		parent: FabricItemDataAccessRoles
	) {
		super(definition.name, parent, undefined, "ItemDataAccessRole");

		this.id = parent.id + "/" + definition.id,

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

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("accounts-view-bar-icon");
	}

	get itemDefinition(): iFabricApiItemDataAccessRole {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemDataAccessRole) {
		this._itemDefinition = value;
	}

	get parent(): FabricItemDataAccessRoles {
		return this._parent as FabricItemDataAccessRoles;
	}

	get getDefinitionFromApi(): boolean {
		return false;
	}

	get apiPath(): string {
		return this.parent.apiPath + this.apiUrlPart
	}

	// Item-specific functions
}