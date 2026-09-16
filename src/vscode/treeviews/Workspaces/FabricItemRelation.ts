import * as vscode from 'vscode';

import { iFabricApiItem } from '../../../fabric/_types';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemRelation extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem,
		workspaceName: string,
		relationTypes: string[]
	) {
		super(`${parent.id}${definition.id}`, definition.displayName, definition.type, parent, definition, undefined, vscode.TreeItemCollapsibleState.None);

		this.itemDefinition = definition;
		this.description = `${definition.type} - ID: ${definition.id}`;
		this.tooltip = this.getToolTip({
			...definition,
			workspace: workspaceName ?? definition.workspaceId,
			relationship: relationTypes.length > 0 ? relationTypes.join(", ") : undefined
		});
	}

	get itemDefinition(): iFabricApiItem {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItem) {
		this._itemDefinition = value;
	}

	get canEdit(): boolean {
		return false;
	}

	get supportsUri(): boolean {
		return false;
	}
}
