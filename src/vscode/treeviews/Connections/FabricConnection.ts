import * as vscode from 'vscode';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { iFabricApiConnection } from '../../../fabric/_types';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnection extends FabricConnectionGenericViewer {

	constructor(
		definition: iFabricApiConnection,
		parent: FabricConnectionTreeItem
	) {
		super(definition.datasourceName ?? definition.key, parent, definition.id);
		this.itemDefinition = definition;

		this.tooltip = this.getToolTip(definition);
		this.iconPath = new vscode.ThemeIcon("extensions-remote");
		this.description = definition.datasourceType;
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
}