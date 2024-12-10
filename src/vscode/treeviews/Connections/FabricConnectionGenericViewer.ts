import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';
import { FabricApiService } from '../../../fabric/FabricApiService';

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

	public async showDefinitionOld(): Promise<void> {
		const content = JSON.stringify(this.itemDefinition, null, "\t");
		let tempUri = await TempFileSystemProvider.createTempFile(Helper.trimChar(this.apiPath, "/", false, true) + ".json", content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}

	public async showDefinition(): Promise<void> {
		let result = await FabricApiService.get(this.apiPath);

		let content: string;
		
		if(result.success) {
			content = JSON.stringify(result.success, null, "\t");
		}
		else {
			content = JSON.stringify(result.error, null, "\t")
			// content = JSON.stringify(this.itemDefinition, null, "\t");
		}

		// const content = JSON.stringify(this.itemDefinition, null, "\t");
		
		let tempUri = await TempFileSystemProvider.createTempFile(this.apiPath, content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}
}