import * as vscode from 'vscode';

import { iFabricApiItemShortcut } from '../../../fabric/_types';
import { FabricWorkspace } from './FabricWorkspace';
import { FabricItemShortcuts } from './FabricItemShortcuts';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemShortcut extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiItemShortcut,
		parent: FabricItemShortcuts
	) {
		super(definition.name, parent, undefined, "ItemShortcut", true);

		this.id = parent.id + "/" + definition.name,

		this.itemDefinition = definition;
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
			const target = this.targetDetails
			if (["AdlsGen2", "GoogleCloudStorage", "AmazonS3"].includes(this.itemDefinition.target.type)) {
				return `${target.location}${target.subpath}`;
			}
			else if (["S3Compatible"].includes(this.itemDefinition.target.type)) {
				return `${target.location}${target.bucket}${target.subpath}`;
			}
			else if (["OneLake"].includes(this.itemDefinition.target.type)) {
				return `${target.path} in ${target.workspaceId}/${target.itemId}`;
			}
			else if (["ExternalDataShareTarget"].includes(this.itemDefinition.target.type)) {
				return `${target.connectionId}`;
			}
			else if (["Dataverse"].includes(this.itemDefinition.target.type)) {
				return `${target.environmentDomain} - ${target.deltaLakeFolder}/${target.tableName}`;
			}
		}
	}

	// LakehouseTable-specific funtions
	get itemDefinition(): iFabricApiItemShortcut {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiItemShortcut) {
		this._itemDefinition = value;
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

	get targetDetails(): any {
		if (this.itemDefinition) {
			const targetType = this.itemDefinition.target.type
			const targetProperty = targetType[0].toLowerCase() + targetType.slice(1)
			return this.itemDefinition.target[targetProperty];
		}
	}

	get getDefinitionFromApi(): boolean {
		return false;
	}

	get oneLakeUri(): vscode.Uri {
		// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		const lakehouse = this.getParentByType<FabricWorkspace>("Lakehouse");

		return vscode.Uri.parse(`onelake://${workspace.itemId}/${lakehouse.itemId}/Tables/${this.itemName}`);
	}
}