import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { Buffer } from '@env/buffer';
import { Helper } from '@utils/Helper';
import { iFabricApiItem } from '../../fabric/_types';

const GUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export interface iFabricItemDetails extends iFabricApiItem {
	definition?: any;
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
				let contents: vscode.MarkdownString[] = [];
				//contents.push(new vscode.MarkdownString("**Fabric Studio**:"));
				if (itemDetails.displayName) {
					contents.push(new vscode.MarkdownString(`**DisplayName**: ${itemDetails.displayName}`));
				}
				if (itemDetails.type) {
					contents.push(new vscode.MarkdownString(`**Type**: \`${itemDetails.type}\``));
				}
				if (itemDetails.workspaceId) {
					const workspaceDetails = FabricGUIDHoverProvider.getFabricObjectNameByGUID(itemDetails.workspaceId);
					if (workspaceDetails && workspaceDetails.displayName) {
						contents.push(new vscode.MarkdownString(`**Workspace**: ${workspaceDetails.displayName}`));
					}
					contents.push(new vscode.MarkdownString(`**WorkspaceId**: \`${itemDetails.workspaceId}\``));
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
}