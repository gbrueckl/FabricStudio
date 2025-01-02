import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspaceGenericViewer extends FabricWorkspaceTreeItem {
	private _customApiUrlPart: string;

	constructor(
		name: string,
		parent: FabricWorkspaceTreeItem,
		apiUrlPart: string = undefined

	) {
		super(parent.id + "/" + name, name, "GenericViewer", parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

		this._customApiUrlPart = apiUrlPart;
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
		if(this._customApiUrlPart != undefined) {
			return this._customApiUrlPart;
		}
		return this.apiUrlPart;
	}

	get _command(): vscode.Command {
		return {
			command: 'FabricStudio.Item.showDefintion', title: "Show Definition", arguments: [this]
		}
	}

	get tempFilePath(): string {
		let tempPath = this.apiPath.replace(/[^A-Za-z0-9\/:\.-]/g, "_");
		if(this.apiPath.startsWith("https://")) {
			tempPath = tempPath.replace("https://", "");
		}
		return tempPath;
	}

	public async showDefinition(): Promise<void> {
		let result = await FabricApiService.get(this.apiPath);

		let content: string;
		
		if(result.success) {
			content = JSON.stringify(result.success, null, "\t");
		}
		else {
			content = JSON.stringify(result.error, null, "\t")
		}
		
		let tempUri = await TempFileSystemProvider.createTempFile(this.tempFilePath, content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}
}