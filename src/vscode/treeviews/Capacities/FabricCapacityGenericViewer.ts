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

	protected onSaveAction = async (savedContent: string): Promise<boolean> => {
		return undefined;
	}
}