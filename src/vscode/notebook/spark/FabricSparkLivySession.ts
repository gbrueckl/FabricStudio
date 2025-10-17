import * as vscode from 'vscode';
import { Helper } from '@utils/Helper';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { iFabricApiLivySessionCreation, iFabricApiResponse, iFabricLivyStatementCreation, iFabricLivyStatementResult } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';
import { SparkNotebookLanguage } from './_types';

export class FabricSparkLivySession {
	public workspaceId: string;
	public lakehouseId: string;
	public sessionId: string;

	constructor(workspaceId: string, lakehouseId: string, sessionId: string) {
		this.workspaceId = workspaceId;
		this.lakehouseId = lakehouseId;
		this.sessionId = sessionId;
	}

	get apiRootEndpoint(): string {
		return `/v1/workspaces/${this.workspaceId}/lakehouses/${this.lakehouseId}/livyapi/versions/2023-12-01/sessions`;
	}

	get apiSessionEndpoint(): string {
		return `${this.apiRootEndpoint}/${this.sessionId}`;
	}

	static async getNewSession(workspaceId: string, lakehouseId: string, language: SparkNotebookLanguage = "pyspark"): Promise<FabricSparkLivySession> {
		const body = {
			"kind": language
		};

		const response = await FabricApiService.post<iFabricApiLivySessionCreation>(`/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyapi/versions/2023-12-01/sessions`, body);
		if (response.error) {
			throw new Error(response.error.message);
		}

		let session = new FabricSparkLivySession(workspaceId, lakehouseId, response.success.id);
		
		return session;
	}

	async waitTillStarted(pollInterval: number = 1000, timeout: number = 300000): Promise<void> {
		await Helper.awaitWithProgress("Attaching to Spark Session", this.waitTillStartedMain(pollInterval, timeout));
	}

	private async waitTillStartedMain(pollInterval: number = 1000, timeout: number = 300000): Promise<void> {
		let isStarted: boolean = false;
		let timeElapsed: number = 0;
		while (!isStarted && timeElapsed < timeout) {
			await Helper.delay(pollInterval);
			timeElapsed += pollInterval;
			// get the session status
			const response = await FabricApiService.get<iFabricApiLivySessionCreation>(this.apiSessionEndpoint);

			if (response.error) {
				ThisExtension.Logger.logError(response.error.message, true, true);
			}

			else if (response.success.state == "idle") {
				isStarted = true;
			}
			else if (response.success.state == "error" || response.success.state == "dead" || response.success.state == "killed") {
				ThisExtension.Logger.logError(`Session ${this.sessionId} is in state ${response.success.state}`, true, true);
			}
			else {
				ThisExtension.Logger.logInfo(`Session ${this.sessionId} is in state ${response.success.state}, waiting...`);
			}
		}

		if (!isStarted) {
			ThisExtension.Logger.logError(`Session ${this.sessionId} did not start within the timeout period of ${timeout} ms`, true, true);
		}
	}

	async stop(): Promise<void> {
		const response = await FabricApiService.delete<void>(this.apiSessionEndpoint, {});
		if (response.error) {
			ThisExtension.Logger.logError(response.error.message, true, true);
		}
		else {
			ThisExtension.Logger.logInfo(`Session ${this.sessionId} stopped successfully`);
		}
	}

	async start(waitTillStarted: boolean = false): Promise<void> {
		let session = await FabricSparkLivySession.getNewSession(this.workspaceId, this.lakehouseId);
		this.sessionId = session.sessionId;
		if (waitTillStarted) {
			await session.waitTillStarted();
		}
	}

	async executeCommand(commandText: string, language: SparkNotebookLanguage = undefined): Promise<iFabricApiResponse<iFabricLivyStatementCreation>> {
		const body = {
			"code": commandText,
			"kind": language
		};

		const createCommand = await FabricApiService.post<iFabricLivyStatementCreation>(`${this.apiSessionEndpoint}/statements`, body);

		return createCommand;
	}

	async waitForCommandResult(commandId: number, token: vscode.CancellationToken, pollInterval: number = 500, timeout: number = undefined): Promise<iFabricApiResponse<iFabricLivyStatementResult>> {
		let result: iFabricApiResponse<iFabricLivyStatementResult> = undefined;
		let timeElapsed: number = 0;

		let cancelled = false

		token.onCancellationRequested(() => {
			ThisExtension.Logger.logInfo(`Command ${commandId} cancelled by user`);
			cancelled = true;
		});

		while (result === undefined || (result.success && result.success?.state !== "available")) {
			await Helper.delay(pollInterval);
			timeElapsed += pollInterval;
			result = await FabricApiService.get<iFabricLivyStatementResult>(Helper.joinPath(this.apiSessionEndpoint, `statements/${commandId}`));

			if (cancelled) {
				result = {
					error: {
						"message": "Command cancelled by user",
						"errorCode": "CommandCancelled"
					}
				};
				break;
			}
		}

		return result;
	}

	get state(): string {
		return JSON.stringify({
			workspaceId: this.workspaceId,
			lakehouseId: this.lakehouseId,
			sessionId: this.sessionId
		})
	}

	//#region static methods to track the context of the notebook
	private static _sessions: Map<string, FabricSparkLivySession> = new Map<string, FabricSparkLivySession>();


	static loadFromMetadata(metadata?: { [key: string]: any }): { [key: string]: any } {

		if (metadata == undefined) {
			metadata = {};
		}
		let newContext: FabricSparkLivySession = FabricSparkLivySession.generateFromOriginalMetadata(metadata);
		let guid = Helper.newGuid(); // we always generate a new guid for the current session

		FabricSparkLivySession.set(guid, newContext);

		metadata.guid = guid;
		// remove context so it is not used unintentionally
		metadata.context = undefined;

		// we only return the guid as metadata
		return metadata;
	}

	static saveToMetadata(metadata: { [key: string]: any }): { [key: string]: any } {
		if (metadata?.guid) {
			metadata.context = FabricSparkLivySession.get(metadata.guid);
			metadata.guid = undefined;
		}

		// we only return the context as metadata
		return metadata;
	}

	static generateFromOriginalMetadata(metadata?: { [key: string]: any }): FabricSparkLivySession {
		let newContext = new FabricSparkLivySession('x', 'x', 'x');

		if (metadata?.context) {
			if (metadata.context.apiRootPath) {
				newContext.workspaceId = metadata.context.apiRootPath;
			}
			if (metadata.context.uri) {
				newContext.lakehouseId = metadata.context.uri;
			}
			if (metadata.context.variables) {
				newContext.sessionId = metadata.context.variables;
			}
		}

		return newContext;
	}

	static set(notebookUri: string, session: FabricSparkLivySession): void {
		FabricSparkLivySession._sessions.set(notebookUri, session);
		if(!session) {
			ThisExtension.setGlobalState("LivySession" + notebookUri, undefined)
		}
		else {
			ThisExtension.setGlobalState("LivySession" + notebookUri, session.state)
		}
	}

	static async get(notebookUri: string): Promise<FabricSparkLivySession> {
		let session = FabricSparkLivySession._sessions.get(notebookUri);

		if (session) {
			return session;
		}
		else {
			let sessionInfo = ThisExtension.getGlobalState<string>("LivySession" + notebookUri);
			if (sessionInfo) {
				ThisExtension.Logger.logInfo(`Trying to re-attach to previous Livy session`);

				let info = JSON.parse(sessionInfo);
				// check if session still exists
				const response = await FabricApiService.get<iFabricApiLivySessionCreation>(`/v1/workspaces/${info.workspaceId}/lakehouses/${info.lakehouseId}/livyapi/versions/2023-12-01/sessions/${info.sessionId}`);

				if (response.success) {
					let session = new FabricSparkLivySession(info.workspaceId, info.lakehouseId, info.sessionId);
					FabricSparkLivySession.set(notebookUri, session);

					if(["not_started", "starting"].includes(response.success.state)) {
						ThisExtension.Logger.logInfo(`Re-attaching to existing Livy session ${info.sessionId}!`, 5000);
						await session.waitTillStarted();
					}
					else if (["error", "dead", "killed", "shutting_down", "success"].includes(response.success.state)) {
						ThisExtension.Logger.logError(`Previous Livy session '${info.sessionId}' is in state ${response.success.state} and cannot be reused!`, false, false);
						return undefined;
					}
					return session;
				}
			}
		}
	}
	//#endregion
}