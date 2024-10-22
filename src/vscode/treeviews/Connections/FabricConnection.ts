import * as vscode from 'vscode';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { iFabricApiConnection, iFabricApiItem } from '../../../fabric/_types';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
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
	}
}