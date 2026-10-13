import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';

/** Lists accessible Fabric workspaces so the language model can select an ID. */
export class FabricStudioListWorkspacesTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.listWorkspaces();
		if (response.error) {
			throw new Error(response.error.message);
		}

		const workspaces = response.success.map(workspace => ({
			id: workspace.id,
			displayName: workspace.displayName,
			type: workspace.type
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ workspaces }, undefined, 2))
		]);
	}
}
