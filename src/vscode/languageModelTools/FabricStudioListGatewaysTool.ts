import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiGateway } from '../../fabric/_types';

/** Lists Fabric gateways so the language model can select a gateway ID. */
export class FabricStudioListGatewaysTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.getList<iFabricApiGateway>("/v1/gateways");
		if (response.error) {
			throw new Error(response.error.message);
		}

		const gateways = response.success.map(gateway => ({
			id: gateway.id,
			displayName: gateway.displayName,
			type: gateway.type,
			numberOfMemberGateways: gateway.numberOfMemberGateways
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ gateways }, undefined, 2))
		]);
	}
}
