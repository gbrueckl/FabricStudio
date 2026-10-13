import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiCapacity } from '../../fabric/_types';

/** Lists Fabric capacities so the language model can select a capacity ID. */
export class FabricStudioListCapacitiesTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.getList<iFabricApiCapacity>("/v1/capacities");
		if (response.error) {
			throw new Error(response.error.message);
		}

		const capacities = response.success.map(capacity => ({
			id: capacity.id,
			displayName: capacity.displayName,
			state: capacity.state,
			sku: capacity.sku,
			region: capacity.region
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ capacities }, undefined, 2))
		]);
	}
}
