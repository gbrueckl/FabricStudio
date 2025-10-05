import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiLivySession } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemLivySession extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiLivySession,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.livyId, parent, definition.livyId);

		this.itemId = definition.livyId;
		this.itemDefinition = definition;

		this.label = this.itemDefinition.sparkApplicationId;
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
			return `${this.itemDefinition.state} - ${this.itemDefinition.livyId}`;
		}
	}

	get canDelete(): boolean {
		return true;
	}

	getIcon(): vscode.ThemeIcon {
		if (this.itemDefinition) {
			if (["Unknown", "NotStarted"].includes(this.itemDefinition.state)) {
				return new vscode.ThemeIcon("circle-large-outline");
			}
			else if (["Failed", "Cancelled"].includes(this.itemDefinition.state)) {
				return new vscode.ThemeIcon("error");
			}
			else if (["InProgress"].includes(this.itemDefinition.state)) {
				return new vscode.ThemeIcon("gear~spin");
			}
			else if (["Succeeded"].includes(this.itemDefinition.state)) {
				return new vscode.ThemeIcon("issue-closed");
			}
		}
	}

	get itemDefinition(): iFabricApiLivySession {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiLivySession) {
		this._itemDefinition = value;
	}

	// Item-specific functions
	public getBrowserLink(): vscode.Uri {
		//https://app.fabric.microsoft.com/workloads/de-ds/sparkmonitor/6a810276-a735-4d5f-abec-79abcab07628/d7edc803-5d33-4970-a934-9c5524c2ab57?experience=fabric-developer&clientSideAuth=0

		return vscode.Uri.joinPath(vscode.Uri.parse(FabricApiService.BrowserBaseUrl), "workloads/de-ds/sparkmonitor", this.parent.parent.itemId, this.itemId);
	}
	
}