import * as vscode from 'vscode';

import { iFabricApiGatewayMember } from '../../../fabric/_types';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';
import { FabricGatewayMembers } from './FabricGatewayMembers';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGatewayMember extends FabricConnectionGenericViewer {

	constructor(
		definition: iFabricApiGatewayMember,
		parent: FabricGatewayMembers
	) {
		super(definition.displayName, parent, definition.id);
		this.itemDefinition = definition;

		this.tooltip = this.getToolTip(definition);
		this.iconPath = new vscode.ThemeIcon("server-environment");
		this.description = definition.id;
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
}