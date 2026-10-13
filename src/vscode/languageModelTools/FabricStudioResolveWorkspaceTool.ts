import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';

interface iResolveWorkspaceToolInput {
	workspaceName: string;
}

/** Resolves a Fabric workspace display name to its workspace ID. */
export class FabricStudioResolveWorkspaceTool implements vscode.LanguageModelTool<iResolveWorkspaceToolInput> {
	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iResolveWorkspaceToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.listWorkspaces();
		if (response.error) {
			throw new Error(response.error.message);
		}

		const workspaceName = options.input.workspaceName.trim();
		const matchingWorkspaces = response.success
			.filter(workspace => workspace.displayName.localeCompare(workspaceName, undefined, { sensitivity: "accent" }) === 0)
			.map(workspace => ({ id: workspace.id, displayName: workspace.displayName, type: workspace.type }));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ workspaceName, matchingWorkspaces }, undefined, 2))
		]);
	}
}
