import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricItem } from './FabricItem';
import { ThisExtension } from '../../../ThisExtension';
import { FabricItemOneLakeFolder } from './FabricItemOneLakeFolder';
import { FabricItemOneLakeFile } from './FabricItemOneLakeFile';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemOneLake extends FabricWorkspaceTreeItem {
	constructor(
		parent: FabricItem
	) {
		super(parent.id + "/OneLake", "OneLake", "OneLake", parent, undefined, "Show OneLake", vscode.TreeItemCollapsibleState.Collapsed);

		this.itemId = parent.id;
		this.itemDefinition = parent.itemDefinition;
		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);
		this.resourceUri = this.oneLakeUri;

		//this.command = this.getCommand();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let actions: string[] = [
			this.itemType.toUpperCase(),
			"RELOAD_FROM_ONELAKE",
			"COPY_NAME"
		];

		return actions.join(",") + ",";
	}

	// description is show next to the label
	get _description(): string {
		if (this.itemDefinition) {
			return `${this.itemDefinition.jobType} - ${this.itemDefinition.invokeType}`;
		}
	}

	get canDelete(): boolean {
		return false;
	}

	get canMove(): boolean {
		return false;
	}

	get canRename(): boolean {	
		return false;
	}

	get canOpenInBrowser(): boolean {
		return false;
	}

	getCommand(): vscode.Command {
		return {
			"title": "Show OneLake",
			"command": "FabricStudio.Item.editOneLake",
			"arguments": [this]
		}
	}

	async getChildrenFromFS(currentItem: FabricItemOneLake | FabricItemOneLakeFolder, element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricWorkspaceTreeItem[] = [];
			let folders: FabricItemOneLakeFolder[] = [];
			let files: FabricItemOneLakeFile[] = [];

			try {
				const items = await vscode.workspace.fs.readDirectory(currentItem.resourceUri);

				for (let item of items) {
					if (item[1] == vscode.FileType.Directory) {
						const folder = new FabricItemOneLakeFolder(vscode.Uri.joinPath(currentItem.resourceUri, item[0]), currentItem);
						folders.push(folder);
					}
					else if (item[1] == vscode.FileType.File) {
						const file = new FabricItemOneLakeFile(vscode.Uri.joinPath(currentItem.resourceUri, item[0]), currentItem);
						files.push(file);
					}
				}

				folders = folders.sort((a, b) => a.itemName.localeCompare(b.itemName));
				files = files.sort((a, b) => a.itemName.localeCompare(b.itemName));

				children = (folders as FabricWorkspaceTreeItem[]).concat(files as FabricWorkspaceTreeItem[]);
			}
			catch (e) {
				ThisExtension.Logger.logError("Could not load OneLakes for item " + currentItem.parent.itemName, true);
			}

			return children;
		}
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		const extensionId = "GerhardBrueckl.onelake-vscode";
		const oneLakeExtensionInstalled = await Helper.ensureExtensionInstalled(extensionId, "OneLake");

		if (!oneLakeExtensionInstalled) {
			return;
		}
		
		return this.getChildrenFromFS(this, element);
	}

	get oneLakeUri(): vscode.Uri {
		return this.parent.oneLakeUri
	}

	get OneLakeRoot(): FabricItemOneLake {
		return this;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	// Item-specific functions
}