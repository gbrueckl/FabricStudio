import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiItemType, fabricApiItemTypes } from '../../fabric/_types';

interface iListWorkspaceItemsToolInput {
	workspaceId: string;
	itemType?: string;
}

/** Lists items in a Fabric workspace so the language model can select an ID. */
export class FabricStudioListWorkspaceItemsTool implements vscode.LanguageModelTool<iListWorkspaceItemsToolInput> {
	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iListWorkspaceItemsToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { itemType, workspaceId } = options.input;
		if (itemType && !fabricApiItemTypes.includes(itemType as FabricApiItemType)) {
			throw new Error(`Unsupported Fabric item type: ${itemType}. Use one of: ${fabricApiItemTypes.join(", ")}.`);
		}

		// AIDEV-NOTE: Validate filters against fabricApiItemTypes before listItems forwards them to the Fabric API.
		const response = await FabricApiService.listItems(workspaceId, itemType as FabricApiItemType | undefined);
		if (response.error) {
			throw new Error(response.error.message);
		}

		const items = response.success.map(item => ({
			id: item.id,
			displayName: item.displayName,
			type: item.type
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ workspaceId, itemType, items }, undefined, 2))
		]);
	}
}
