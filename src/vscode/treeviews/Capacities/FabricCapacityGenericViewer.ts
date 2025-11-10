import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricCapacityTreeItem } from './FabricCapacityTreeItem';
import { FabricApiItemType } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { TempFileSystemProvider } from '../../filesystemProvider/temp/TempFileSystemProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricCapacityGenericViewer extends FabricCapacityTreeItem {
	private _customApiUrlPart: string;

	constructor(
		name: string,
		parent: FabricCapacityTreeItem,
		apiUrlPart: string = undefined,
		itemType: FabricApiItemType = "GenericViewer"
	) {
		super(parent.id + "/" + name, name, itemType, parent, undefined, undefined, vscode.TreeItemCollapsibleState.None);

		this._customApiUrlPart = apiUrlPart;
		// the CapacityId is not unique for logical folders hence we make it unique
		//this.id = this.CapacityId + "/" + parent.itemId + "/" + this.itemType.toString();
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

	get tempFilePath(): string {
		let tempPath = this.apiPath.replace(/[^A-Za-z0-9\/:\.-]/g, "_");
		if (this.apiPath.startsWith("https://")) {
			tempPath = tempPath.replace("https://", "");
		}
		return tempPath;
	}

	get getDefinitionFromApi(): boolean {
		return true;
	}

	public async showDefinition(): Promise<void> {
		let content: any = this.itemDefinition;

		if (this.getDefinitionFromApi) {
			let result = await FabricApiService.get(this.apiPath);

			if (result.success) {
				content = result.success;
			}
			else {
				ThisExtension.Logger.logWarning(`Could not load definition from API '${this.apiPath}', showing cached definition if available.`);
			}
		}

		content = JSON.stringify(content, null, "\t");

		let tempUri = await TempFileSystemProvider.createTempFile(this.tempFilePath, content);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}
}