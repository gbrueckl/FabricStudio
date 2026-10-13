import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiTag } from '../../fabric/_types';

/** Lists Fabric admin tags so the language model can select a tag ID. */
export class FabricStudioListTagsTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.getList<iFabricApiTag>("admin/tags", undefined, "value", "displayName");
		if (response.error) {
			throw new Error(response.error.message);
		}

		const tags = response.success.map(tag => ({ id: tag.id, displayName: tag.displayName }));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ tags }, undefined, 2))
		]);
	}
}
