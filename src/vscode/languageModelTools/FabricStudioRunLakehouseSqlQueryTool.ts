import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricSparkLivySession } from '../notebook/spark/FabricSparkLivySession';
import { iFabricApiLivySessionJsonResultSet } from '../notebook/spark/_types';

const RUN_QUERY = 'Run query';
const RUN_QUERY_AND_SKIP_CONFIRMATION = 'Run and don\'t ask again in this session';
const CANCEL_QUERY = 'Cancel';

interface iRunLakehouseSqlQueryToolInput {
	workspaceId: string;
	lakehouseId: string;
	query: string;
}

interface iLakehouseSqlSession {
	session: FabricSparkLivySession;
	queue: Promise<void>;
	workspaceName: string;
	lakehouseName: string;
}

interface iLakehouseSqlNames {
	workspaceName: string;
	lakehouseName: string;
}

/** Runs a SQL statement against a Fabric lakehouse using an interactive Livy session. */
export class FabricStudioRunLakehouseSqlQueryTool implements vscode.LanguageModelTool<iRunLakehouseSqlQueryToolInput> {
	private static readonly _sessions = new Map<string, iLakehouseSqlSession>();
	private static readonly _sessionPromises = new Map<string, Promise<iLakehouseSqlSession>>();
	private static readonly _lakehouseNames = new Map<string, iLakehouseSqlNames>();
	private static readonly _lakehouseNamePromises = new Map<string, Promise<iLakehouseSqlNames>>();
	private static _skipConfirmationForSession = false;

	public async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<iRunLakehouseSqlQueryToolInput>
	): Promise<vscode.PreparedToolInvocation> {
		const names = await this.getLakehouseNames(options.input.workspaceId, options.input.lakehouseId);
		return {
			invocationMessage: `Running SQL query against ${names.lakehouseName} in ${names.workspaceName}`
		};
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iRunLakehouseSqlQueryToolInput>,
		token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { workspaceId, lakehouseId, query } = options.input;
		if (!workspaceId?.trim() || !lakehouseId?.trim() || !query?.trim()) {
			throw new Error('workspaceId, lakehouseId, and a non-empty SQL query are required.');
		}
		const names = await this.getLakehouseNames(workspaceId, lakehouseId);
		await this.confirmQuery(names.workspaceName, names.lakehouseName, query);

		const key = `${workspaceId}/${lakehouseId}`;
		const sessionEntry = await this.getSession(key, workspaceId, lakehouseId, names);

		const execution = sessionEntry.queue.then(() =>
			this.executeQuery(sessionEntry, workspaceId, lakehouseId, query, token)
		);
		sessionEntry.queue = execution.then(() => undefined, () => undefined);
		return execution;
	}

	private async confirmQuery(workspaceName: string, lakehouseName: string, query: string): Promise<void> {
		if (FabricStudioRunLakehouseSqlQueryTool._skipConfirmationForSession) {
			return;
		}

		// AIDEV-NOTE: Keep the opt-out in memory so it resets when this VS Code extension session ends.
		const choice = await vscode.window.showWarningMessage(
			`Run this SQL query against lakehouse \`${lakehouseName}\` in workspace \`${workspaceName}\`? The query may modify data.\n\n${query}`,
			{ modal: true },
			RUN_QUERY,
			RUN_QUERY_AND_SKIP_CONFIRMATION,
			CANCEL_QUERY
		);

		if (choice === RUN_QUERY_AND_SKIP_CONFIRMATION) {
			FabricStudioRunLakehouseSqlQueryTool._skipConfirmationForSession = true;
		}
		else if (choice !== RUN_QUERY) {
			throw new Error('Lakehouse SQL query was cancelled by the user.');
		}
	}

	private async getLakehouseNames(workspaceId: string, lakehouseId: string): Promise<iLakehouseSqlNames> {
		const key = `${workspaceId}/${lakehouseId}`;
		const session = FabricStudioRunLakehouseSqlQueryTool._sessions.get(key);
		if (session) {
			return { workspaceName: session.workspaceName, lakehouseName: session.lakehouseName };
		}
		const cachedNames = FabricStudioRunLakehouseSqlQueryTool._lakehouseNames.get(key);
		if (cachedNames) {
			return cachedNames;
		}

		let namesPromise = FabricStudioRunLakehouseSqlQueryTool._lakehouseNamePromises.get(key);
		if (!namesPromise) {
			namesPromise = (async () => {
				const [workspaceResponse, lakehouseResponse] = await Promise.all([
					FabricApiService.getWorkspace(workspaceId),
					FabricApiService.getItem(workspaceId, lakehouseId)
				]);
				if (workspaceResponse.error) {
					throw new Error(workspaceResponse.error.message);
				}
				if (!workspaceResponse.success) {
					throw new Error(`Could not retrieve workspace details for ${workspaceId}.`);
				}
				if (lakehouseResponse.error) {
					throw new Error(lakehouseResponse.error.message);
				}
				if (!lakehouseResponse.success) {
					throw new Error(`Could not retrieve lakehouse details for ${lakehouseId}.`);
				}
				if (lakehouseResponse.success.type !== 'Lakehouse') {
					throw new Error(`Item ${lakehouseId} is a ${lakehouseResponse.success.type}, not a lakehouse.`);
				}

				const names = {
					workspaceName: workspaceResponse.success.displayName,
					lakehouseName: lakehouseResponse.success.displayName
				};
				FabricStudioRunLakehouseSqlQueryTool._lakehouseNames.set(key, names);
				return names;
			})();
			FabricStudioRunLakehouseSqlQueryTool._lakehouseNamePromises.set(key, namesPromise);
			void namesPromise.finally(() => {
				if (FabricStudioRunLakehouseSqlQueryTool._lakehouseNamePromises.get(key) === namesPromise) {
					FabricStudioRunLakehouseSqlQueryTool._lakehouseNamePromises.delete(key);
				}
			}).catch(() => undefined);
		}

		return namesPromise;
	}

	private async getSession(
		key: string,
		workspaceId: string,
		lakehouseId: string,
		names: iLakehouseSqlNames
	): Promise<iLakehouseSqlSession> {
		const existingSession = FabricStudioRunLakehouseSqlQueryTool._sessions.get(key);
		if (existingSession) {
			return existingSession;
		}

		let sessionPromise = FabricStudioRunLakehouseSqlQueryTool._sessionPromises.get(key);
		if (!sessionPromise) {
			sessionPromise = (async () => {
				const session = await FabricSparkLivySession.getNewSession(workspaceId, lakehouseId, 'sql');
				if (!session) {
					throw new Error('Could not create a Livy session for the lakehouse.');
				}
				try {
					await session.waitTillStarted();
				}
				catch (error) {
					await session.stop();
					throw error;
				}

				const sessionEntry: iLakehouseSqlSession = {
					session,
					queue: Promise.resolve(),
					workspaceName: names.workspaceName,
					lakehouseName: names.lakehouseName
				};
				FabricStudioRunLakehouseSqlQueryTool._sessions.set(key, sessionEntry);
				return sessionEntry;
			})();
			FabricStudioRunLakehouseSqlQueryTool._sessionPromises.set(key, sessionPromise);
			void sessionPromise.finally(() => {
				if (FabricStudioRunLakehouseSqlQueryTool._sessionPromises.get(key) === sessionPromise) {
					FabricStudioRunLakehouseSqlQueryTool._sessionPromises.delete(key);
				}
			}).catch(() => undefined);
		}

		return sessionPromise;
	}

	private async executeQuery(
		sessionEntry: iLakehouseSqlSession,
		workspaceId: string,
		lakehouseId: string,
		query: string,
		token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		if (token.isCancellationRequested) {
			throw new Error('Lakehouse SQL query was cancelled before execution.');
		}

		const command = await sessionEntry.session.executeCommand(query, 'sql');
		if (command.error) {
			throw new Error(command.error.message);
		}
		if (!command.success) {
			throw new Error('The Livy session did not accept the SQL query.');
		}

		const cancellationSubscription = token.onCancellationRequested(() => {
			void sessionEntry.session.cancelCommand(command.success).catch(error => {
				vscode.window.showWarningMessage(`Could not cancel the lakehouse SQL query: ${error instanceof Error ? error.message : String(error)}`);
			});
		});

		let result: Awaited<ReturnType<FabricSparkLivySession['waitForCommandResult']>>;
		try {
			result = await sessionEntry.session.waitForCommandResult(command.success.id, 500, 300000, token);
		}
		finally {
			cancellationSubscription.dispose();
		}

		if (result.error) {
			throw new Error(result.error.message);
		}
		if (!result.success) {
			throw new Error('The Livy session returned no result for the SQL query.');
		}

		const output = result.success.output;
		if (result.success.state === 'error' || output?.status !== 'ok') {
			const message = [output?.ename, output?.evalue, ...(output?.traceback ?? [])].filter(Boolean).join('\n');
			throw new Error(message || `The SQL query finished with status '${output?.status ?? result.success.state}'.`);
		}

		const jsonResult = output.data?.['application/json'] as iFabricApiLivySessionJsonResultSet | undefined;
		const rows = jsonResult
			? jsonResult.data.map(row => Object.fromEntries(jsonResult.schema.fields.map((field, index) => [field.name, row[index]])))
			: undefined;
		const response = {
			workspace: sessionEntry.workspaceName,
			lakehouse: sessionEntry.lakehouseName,
			query,
			...(jsonResult ? { columns: jsonResult.schema.fields, rows } : { output: output.data ?? {} })
		};

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(response, undefined, 2))
		]);
	}

}
