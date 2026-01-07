import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';
import { FabricCommandBuilder } from '../../input/FabricCommandBuilder';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceGenericViewer extends FabricWorkspaceTreeItem {
	private _customApiUrlPart: string;
	private _canUpdate: boolean;

	constructor(
		name: string,
		parent: FabricWorkspaceTreeItem,
		apiUrlPart: string = undefined,
		itemType: FabricApiItemType = "GenericViewer",
		canUpdate: boolean = false
	) {
		super(parent.id + "/" + name, name, itemType, parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

		this._customApiUrlPart = apiUrlPart;
		this._canUpdate = canUpdate;

		// the workspaceId is not unique for logical folders hence we make it unique
		//this.id = this.workspaceId + "/" + parent.itemId + "/" + this.itemType.toString();
		this.iconPath = this.getIcon();
		this.command = this._command;
	}

	getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon("json");
	}

	// tooltip shown when hovering over the item
	get _tooltip(): string {
		return undefined;
	}

	// description is show next to the label
	get _description(): string {
		return undefined;
	}

	get apiUrlPart(): string {
		if (this._customApiUrlPart != undefined) {
			return this._customApiUrlPart;
		}
		return super.apiUrlPart;
	}

	get _command(): vscode.Command {
		return {
			command: 'FabricStudio.Item.showDefintion', title: "Show Definition", arguments: [this]
		}
	}
}