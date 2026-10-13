import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiItemType, fabricApiItemTypes } from '../../fabric/_types';

interface iResolveWorkspaceItemsToolInput {
	workspaceId: string;
	itemName?: string;
	itemType?: string;
}

/** Resolves Fabric item names to IDs within a workspace. */
export class FabricStudioResolveWorkspaceItemsTool implements vscode.LanguageModelTool<iResolveWorkspaceItemsToolInput> {
	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iResolveWorkspaceItemsToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { itemName, itemType, workspaceId } = options.input;
		if (itemType && !fabricApiItemTypes.includes(itemType as FabricApiItemType)) {
			throw new Error(`Unsupported Fabric item type: ${itemType}. Use one of: ${fabricApiItemTypes.join(", ")}.`);
		}

		// AIDEV-NOTE: Validate filters against fabricApiItemTypes before listItems forwards them to the Fabric API.
		const response = await FabricApiService.listItems(workspaceId, itemType as FabricApiItemType | undefined);
		if (response.error) {
			throw new Error(response.error.message);
		}

		const normalizedItemName = itemName?.trim();
		// AIDEV-NOTE: Apply name matching after listItems so the API can filter by a requested item type first.
		const matchingItems = response.success
			.filter(item => !normalizedItemName || item.displayName.localeCompare(normalizedItemName, undefined, { sensitivity: "accent" }) === 0)
			.map(item => ({ id: item.id, displayName: item.displayName, type: item.type }));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({
				workspaceId,
				itemName: normalizedItemName,
				itemType,
				matchingItems
			}, undefined, 2))
		]);
	}
}
