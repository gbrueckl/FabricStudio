import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { FabricApiNotebookSerializer } from '../notebook/api/FabricApiNotebookSerializer';

const GUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export interface iFabricItemDetails {
	itemId: string;
	itemName: string;
	apiPath?: string;
	itemType: string;
	itemDefinition: any;
	canDelete: boolean;
	canRename: boolean;
	canOpenInBrowser: boolean;
	treeProvider: string;
	contextValue: string;
	workspaceId: string;
	parent: iFabricItemDetails | undefined;
	filePath?: vscode.Uri | string;
}

export class FabricGUIDHoverProvider implements vscode.HoverProvider {
	private static _sessionCache: Map<string, iFabricItemDetails> = new Map<string, iFabricItemDetails>();

	constructor() {
		FabricGUIDHoverProvider._sessionCache = new Map<string, iFabricItemDetails>();
	}

	public static async register(context: vscode.ExtensionContext) {
		const hoverProvider = new FabricGUIDHoverProvider()
		context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: '*', language: '*' }, hoverProvider));
	}

	public async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<vscode.Hover> {
		const range = document.getWordRangeAtPosition(position, GUID_REGEX);
		if (range) {
			const guid = document.getText(range);

			const itemDetails = FabricGUIDHoverProvider.getFabricObjectNameByGUID(guid);
			if (itemDetails) {
				let contents: vscode.MarkdownString[] = [
					new vscode.MarkdownString(`### Fabric Item Details`)
				];

				let openText = "";
				if (itemDetails.filePath) {
					const args = encodeURIComponent(JSON.stringify([itemDetails.filePath]));
					openText = ` ([Open](command:vscode.open?${args}))`;
				}
				//contents.push(new vscode.MarkdownString("**Fabric Studio**:"));
				if (itemDetails.itemName) {
					let md = new vscode.MarkdownString(`**DisplayName**: ${itemDetails.itemName}${openText}`);
					md.isTrusted = true;
					contents.push(md);
				}
				if (itemDetails.itemType) {
					contents.push(new vscode.MarkdownString(`**Type**: ${itemDetails.itemType}`));
				}
				const workspaceId = itemDetails.workspaceId || itemDetails.itemDefinition?.workspaceId;
				if (workspaceId && itemDetails.itemType.toUpperCase() !== "WORKSPACE") {
					const workspaceDetails = FabricGUIDHoverProvider.getFabricObjectNameByGUID(workspaceId);
					if (workspaceDetails && workspaceDetails.itemName) {
						contents.push(new vscode.MarkdownString(`**Workspace**: ${workspaceDetails.itemName}`));
					}
					contents.push(new vscode.MarkdownString(`**WorkspaceId**: \`${workspaceId}\``));
				}


				return new vscode.Hover(contents, range);
			}
		}
	}

	private static getFabricObjectNameByGUID(guid: string): iFabricItemDetails {
		if (this._sessionCache.has(guid)) {
			return this._sessionCache.get(guid);
		}
		const itemDetails = ThisExtension.getGlobalState<iFabricItemDetails>(`fabricObjectName_${guid.toLowerCase()}`);
		if (itemDetails) {
			this._sessionCache.set(guid, itemDetails);
		}
		return itemDetails;
	}

	public static async cacheFabricObjectName(guid: string, definition: iFabricItemDetails): Promise<void> {
		this._sessionCache.set(guid, definition);
		await ThisExtension.setGlobalState(`fabricObjectName_${guid.toLowerCase()}`, definition);
	}

	public static async findById(): Promise<void> {
		const guid = await vscode.window.showInputBox({
			prompt: 'Enter the Fabric GUID to find',
			placeHolder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
		});
		if (!guid || !GUID_REGEX.test(guid)) {
			vscode.window.showErrorMessage('Invalid GUID format. Please enter a valid Fabric GUID.');
			return;
		}
		const itemDetails = this.getFabricObjectNameByGUID(guid);

		if (itemDetails) {
			let msg = `Found Fabric item with ID '${guid}': ${itemDetails.itemType} '${itemDetails.itemName}'`;
			const workspaceId = itemDetails.workspaceId || itemDetails.itemDefinition?.workspaceId;
			if (workspaceId) {
				const workspaceDetails = this.getFabricObjectNameByGUID(workspaceId);
				if (workspaceDetails && workspaceDetails.itemName) {
					msg += ` in Workspace '${workspaceDetails.itemName}' (ID: ${workspaceId})`;
				}
			}

			ThisExtension.Logger.logInfo(msg);
			const action = await vscode.window.showInformationMessage(msg, "Open in API Notebook");

			if (action && action == "Open in API Notebook") {
				FabricApiNotebookSerializer.openNewNotebook(itemDetails);
			}
		}
		else {
			vscode.window.showWarningMessage('No Fabric item found with the provided GUID.');
		}
	}
}