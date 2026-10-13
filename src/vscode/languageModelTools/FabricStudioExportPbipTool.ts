import * as vscode from 'vscode';

import { PowerBI } from '@utils/PowerBI';

interface iExportPbipToolInput {
	workspaceId: string;
	itemId: string;
	itemType: "Report" | "SemanticModel";
}

/** Exports a Fabric report or semantic model as a Power BI Project. */
export class FabricStudioExportPbipTool implements vscode.LanguageModelTool<iExportPbipToolInput> {
	public prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<iExportPbipToolInput>): vscode.PreparedToolInvocation {
		const itemType = options.input.itemType === "SemanticModel" ? "semantic model" : "report";

		return {
			invocationMessage: `Exporting ${itemType} as a Power BI Project (PBIP)`,
			confirmationMessages: {
				title: `Export ${itemType} as PBIP`,
				message: `Choose a local destination and export the selected ${itemType} from workspace \`${options.input.workspaceId}\`.`
			}
		};
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iExportPbipToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { itemId, itemType, workspaceId } = options.input;

		// AIDEV-NOTE: The existing PowerBI methods own the interactive PBIP destination and connection-mode flows.
		if (itemType === "Report") {
			await PowerBI.downloadReportAsPBIP(itemId, workspaceId);
		}
		else if (itemType === "SemanticModel") {
			await PowerBI.downloadDatasetAsPBIP(itemId, workspaceId);
		}
		else {
			throw new Error(`Unsupported PBIP item type: ${itemType}. Use Report or SemanticModel.`);
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(`The PBIP export flow for the ${itemType.toLowerCase()} has completed.`)
		]);
	}
}
