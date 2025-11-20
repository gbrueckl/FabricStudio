import * as vscode from 'vscode';
import { Helper } from '@utils/Helper';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { iFabricApiLivySessionCreation, iFabricApiResponse, iFabricLivyStatementCreation, iFabricLivyStatementResult } from '../../../fabric/_types';
import { ThisExtension } from '../../../ThisExtension';
import { SparkNotebookLanguage } from './_types';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';

export class FabricSparkLivySession {
	public workspaceId: string;
	public lakehouseId: string;
	public sessionId: string;
	public notebookUri: vscode.Uri;

	constructor(workspaceId: string, lakehouseId: string, sessionId: string, notebookUri: vscode.Uri = null) {
		this.workspaceId = workspaceId;
		this.lakehouseId = lakehouseId;
		this.sessionId = sessionId;
		this.notebookUri = notebookUri;
	}

	get apiRootEndpoint(): string {
		return `/v1/workspaces/${this.workspaceId}/lakehouses/${this.lakehouseId}/livyapi/versions/2023-12-01/sessions`;
	}

	get apiSessionEndpoint(): string {
		return `${this.apiRootEndpoint}/${this.sessionId}`;
	}

	async getRunWorkspaceId(): Promise<string> {
		if (this.notebookUri) {
			if (this.notebookUri.scheme === FABRIC_SCHEME) {
				const fabricUri = await FabricFSUri.getInstance(this.notebookUri, true);
				return fabricUri.workspaceId;
			}
		}
		return this.workspaceId;
	}

	static async getNewSession(workspaceId: string, lakehouseId: string, language: SparkNotebookLanguage = "pyspark", notebookUri: vscode.Uri = null): Promise<FabricSparkLivySession> {
		const body = {
			"kind": language
		};

		const response = await FabricApiService.post<iFabricApiLivySessionCreation>(`/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyapi/versions/2023-12-01/sessions`, body);
		if (response.error) {
			throw new Error(response.error.message);
		}

		let session = new FabricSparkLivySession(workspaceId, lakehouseId, response.success.id, notebookUri);

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
			ThisExtension.Logger.logInfo(`Session ${this.sessionId} stopped successfully`, 5000);
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
		// https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-api-livy-session#submit-a-sparksql-statement-using-the-livy-api-spark-session
		const body = {
			"code": commandText,
			"kind": language
		};

		const createCommand = await FabricApiService.post<iFabricLivyStatementCreation>(`${this.apiSessionEndpoint}/statements`, body);

		return createCommand;
	}

	async waitForCommandResult(commandId: number, pollInterval: number = 500, timeout: number = undefined): Promise<iFabricApiResponse<iFabricLivyStatementResult>> {
		let result: iFabricApiResponse<iFabricLivyStatementResult> = undefined;
		let timeElapsed: number = 0;

		while (result === undefined || (result.success && !["available", "cancelled", "error"].includes(result.success?.state))) {
			await Helper.delay(pollInterval);
			timeElapsed += pollInterval;
			result = await FabricApiService.get<iFabricLivyStatementResult>(Helper.joinPath(this.apiSessionEndpoint, `statements/${commandId}`));
		}

		return result;
	}

	async cancelCommand(command: iFabricLivyStatementCreation): Promise<iFabricApiResponse<iFabricLivyStatementCreation>> {
		// https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-api-livy-session#close-the-livy-session-with-a-third-statement
		const deleteCommand = await FabricApiService.post<iFabricLivyStatementResult>(Helper.joinPath(this.apiSessionEndpoint, `statements/${command.id}/cancel`), {});

		return deleteCommand;
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

	static set(notebookUri: string, session: FabricSparkLivySession): void {
		FabricSparkLivySession._sessions.set(notebookUri, session);
		if (!session) {
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
				const existingSession = await FabricApiService.get<iFabricApiLivySessionCreation>(`/v1/workspaces/${info.workspaceId}/lakehouses/${info.lakehouseId}/livyapi/versions/2023-12-01/sessions/${info.sessionId}`);

				if (existingSession.success) {
					let session = new FabricSparkLivySession(info.workspaceId, info.lakehouseId, info.sessionId, vscode.Uri.parse(notebookUri));
					FabricSparkLivySession.set(notebookUri, session);

					if (["error", "dead", "killed", "shutting_down", "success"].includes(existingSession.success.state)) {
						ThisExtension.Logger.logError(`Previous Livy session '${info.sessionId}' is in state ${existingSession.success.state} and cannot be reused!`, false, false);
					}
					else {
						const reattach = await vscode.window.showInformationMessage(`A previous Spark Livy session (${info.sessionId}) was found. Do you want to re-attach to it or start a new session?`, "Re-attach", "New Session");
						if (reattach == "Re-attach") {
							if (["not_started", "starting"].includes(existingSession.success.state)) {
								ThisExtension.Logger.logInfo(`Re-attaching to existing Livy session ${info.sessionId}!`, 5000);
								await session.waitTillStarted();
							}
							return session;
						}
					}
					return undefined;
				}
			}
		}
		//#endregion
	}
}