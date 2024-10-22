import * as vscode from 'vscode';

import { iFabricApiConnection } from '../../../fabric/_types';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGateway extends FabricConnectionGenericFolder {

	constructor(
		definition: iFabricApiConnection
	) {
		super(definition.clusterId, definition.clusterName ?? definition.gatewayType, "Gateway", undefined, definition.clusterId, vscode.TreeItemCollapsibleState.Collapsed);
		this.itemDefinition = definition;

		this.description = definition.clusterId ?? definition.gatewayType;
		this.tooltip = this.getToolTip(definition);
		this.iconPath = this.getIcon();
	}

	/* Overwritten properties from FabricConnectionGenericFolder */
	protected getIcon(): vscode.Uri | vscode.ThemeIcon {
		if (this.itemDefinition.gatewayType === "Enterprise") {
			return new vscode.ThemeIcon("cloud-upload");
		}
		else {
			return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'genericfolder.svg');
		}
	}

	protected getToolTip(definition: any) {
		if (!definition) return undefined;

		let tooltips: string[] = [
			`clusterId: ${definition.clusterId}`,
			`clusterName: ${definition.clusterName}`,
			`gatewayType: ${definition.gatewayType}`
		];

		return tooltips.join("\n");
	}
}