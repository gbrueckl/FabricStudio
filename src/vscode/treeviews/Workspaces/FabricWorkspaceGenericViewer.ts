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

		let tempUri = await TempFileSystemProvider.createTempFile(this.tempFilePath, content, this.onSaveAction, ".json",);

		vscode.workspace.openTextDocument(tempUri).then(
			document => vscode.window.showTextDocument(document)
		);
	}

	private onSaveAction = async (savedContent: string): Promise<boolean> => {
		try {
			const confirmQp = await FabricCommandBuilder.showQuickPick(
				[new FabricQuickPickItem("yes"), new FabricQuickPickItem("no")],
				`Do you want to push your changes to the Fabric Service?`, undefined, undefined);
			let confirm = confirmQp?.value || "no";

			if (confirm === "yes") {
				await FabricApiService.patch(this.apiPath, JSON.parse(savedContent));
				ThisExtension.Logger.logInfo(`Successfully published changes to the Fabric Service!`);
				return true;
			}
			else {
				ThisExtension.Logger.logWarning(`Publish to Fabric Service was cancelled by the user.`);
				return false;
			}
		} catch (error) {
			ThisExtension.Logger.logError(`Could not publish changes to Fabric Service: ${error.message}`);
			return false;
		}
	}
}