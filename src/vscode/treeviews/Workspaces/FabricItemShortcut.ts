import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItemShortcut, iFabricApiLakehouseTable } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricItemShortcuts } from './FabricItemShortcuts';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemShortcut extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItemShortcut,
		parent: FabricItemShortcuts
	) {
		super(definition.name, definition.name, "ItemShortcut", parent, definition, undefined, vscode.TreeItemCollapsibleState.None);

		this.id = parent.parent.itemId + "/" + definition.name,

			this.tooltip = this.getToolTip(this.itemDefinition);
		this.description = this._description;

		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricApiTreeItem */
	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("link");
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSE_IN_ONELAKE"];

		return orig + actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.path}`;
		}
	}

	// LakehouseTable-specific funtions
	get itemDefinition(): iFabricApiItemShortcut {
		return this._itemDefinition;
	}

	get name(): string {
		return this.itemDefinition.name;
	}

	get path(): string {
		return this.itemDefinition.path;
	}

	get target(): object {
		return this.itemDefinition.target;
	}

	

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const lakehouse = this.getParentByType<FabricWorkspace>("Lakehouse");

		return vscode.Uri.parse(`onelake://${workspace.itemId}/${lakehouse.itemId}/Tables/${this.itemName}`);
	}
}