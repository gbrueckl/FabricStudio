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

	constructor() { }

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

			const itemDetails = this.getFabricObjectNameByGUID(guid);
			if (itemDetails) {
				let contents: vscode.MarkdownString[] = [];
				//contents.push(new vscode.MarkdownString("**Fabric Studio**:"));
				if(itemDetails.displayName) {
					contents.push(new vscode.MarkdownString(`**DisplayName**: ${itemDetails.displayName}`));
					if(itemDetails.type) {
						contents.push(new vscode.MarkdownString(`**Type**: \`${itemDetails.type}\``));
					}
				} 

				return new vscode.Hover(contents, range);
			}
		}
	}

	private getFabricObjectNameByGUID(guid: string): iFabricItemDetails {
		return ThisExtension.getGlobalState(`fabricObjectName_${guid.toLowerCase()}`);
	}

	public static async cacheFabricObjectName(guid: string, definition: iFabricItemDetails): Promise<void> {
		await ThisExtension.setGlobalState(`fabricObjectName_${guid.toLowerCase()}`, definition);
	}
}