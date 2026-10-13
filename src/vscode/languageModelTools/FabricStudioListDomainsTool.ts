import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiAdminDomain } from '../../fabric/_types';

/** Lists Fabric admin domains so the language model can select a domain ID. */
export class FabricStudioListDomainsTool implements vscode.LanguageModelTool<object> {
	public async invoke(
		_options: vscode.LanguageModelToolInvocationOptions<object>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const response = await FabricApiService.getList<iFabricApiAdminDomain>("admin/domains", undefined, "domains", "displayName");
		if (response.error) {
			throw new Error(response.error.message);
		}

		const domains = response.success.map(domain => ({
			id: domain.id,
			displayName: domain.displayName,
			description: domain.description,
			parentDomainId: domain.parentDomainId,
			contributorsScope: domain.contributorsScope
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ domains }, undefined, 2))
		]);
	}
}
