import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiConnection } from '../../fabric/_types';

/** Lists Fabric connections so the language model can select a connection ID. */
export class FabricStudioListConnectionsTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.getList<iFabricApiConnection>("/v1/connections");
		if (response.error) {
			throw new Error(response.error.message);
		}

		const connections = response.success.map(connection => ({
			id: connection.id,
			displayName: connection.displayName,
			connectivityType: connection.connectivityType,
			gatewayId: connection.gatewayId,
			connectionType: connection.connectionDetails.type,
			path: connection.connectionDetails.path
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ connections }, undefined, 2))
		]);
	}
}
