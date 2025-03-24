import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricAdminTreeItem } from './FabricAdminTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricAdminGenericViewer extends FabricAdminTreeItem {
	constructor(
		name: string,
		parent: FabricAdminTreeItem,
		itemType: FabricApiItemType = "GenericViewer"
	) {
		super(parent.id + "/" + name, name, itemType, parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

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


	get _command(): vscode.Command {
		return {
			command: 'FabricStudio.Admin.showDefintion', title: "Show Definition", arguments: [this]
		}
	}

	get apiUrlPart(): string {
		return this.itemDefinition.settingName
	}

	get tempFilePath(): string {
		let tempPath = this.apiPath.replace(/[^A-Za-z0-9\/:\.-]/g, "_");
		if (this.apiPath.startsWith("https://")) {
			tempPath = tempPath.replace("https://", "");
		}
		return tempPath;
	}

	public async showDefinition(): Promise<void> {
		let content = this.itemDefinition;

		content = JSON.stringify(content, null, "\t");

		let tempUri = await TempFileSystemProvider.createTempFile(this.tempFilePath, content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}
}