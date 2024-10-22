import * as vscode from 'vscode';

import { Helper, UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnectionGenericViewer extends FabricConnectionTreeItem {
	private _customApiUrlPart: string;

	constructor(
		name: string,
		parent: FabricConnectionTreeItem,
		apiUrlPart: string = undefined
	) {
		super(parent.apiPath + name, name, "GenericViewer", parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

		this._customApiUrlPart = apiUrlPart;
		// the ConnectionId is not unique for logical folders hence we make it unique
		//this.id = this.ConnectionId + "/" + parent.itemId + "/" + this.itemType.toString();
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
		if(this._customApiUrlPart != undefined) {
			return this._customApiUrlPart;
		}
		return this.itemType;
	}

	get _command(): vscode.Command {
		return {
			command: 'FabricStudio.Item.showDefintion', title: "Show Definition", arguments: [this]
		}
	}

	public async showDefinition(): Promise<void> {
		const content = JSON.stringify(this.itemDefinition, null, "\t");
		let tempUri = await TempFileSystemProvider.createTempFile(Helper.trimChar(this.apiPath, "/", false, true) + ".json", content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}
}