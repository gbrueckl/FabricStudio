import * as vscode from 'vscode';

import { fetch, RequestInit, Response, getProxyAgent } from '@env/fetch';
import { Helper } from '@utils/Helper';
import { iGenericApiCallConfig, iGenericApiError, iGenericApiResponse } from '@utils/_types';

import { ThisExtension } from '../ThisExtension';
import { FabricApiItemFormat, FabricApiItemType, iFabricApiItem, iFabricApiItemDefinition, iFabricApiItemPart, iFabricApiResponse, iFabricApiWorkspace, iFabricErrorResponse, iFabricListResponse, iFabricPollingResponse } from './_types';

import { FabricConfiguration, TYPES_WITH_DEFINITION } from '../vscode/configuration/FabricConfiguration';
import { FabricLogger } from '@utils/FabricLogger';

export abstract class FabricApiService {
	protected static _logger: FabricLogger;
	protected static _isInitialized: boolean = false;
	protected static _connectionTestRunning: boolean = false;

	protected static _apiBaseUrl: string;
	protected static _tenantId: string;
	protected static _clientId: string;
	protected static _authenticationProvider: string;
	protected static _resourceId: string;

	protected static _headers;
	protected static _vscodeSession: vscode.AuthenticationSession;

	//#region Initialization
	static async initialize(
	): Promise<boolean> {

		try {
			this._logger = ThisExtension.Logger;
			this.Logger.log(`Initializing Fabric API Service ...`);

			vscode.authentication.onDidChangeSessions((event) => this._onDidChangeSessions(event));

			this._apiBaseUrl = Helper.trimChar(FabricConfiguration.apiUrl, '/');
			this._tenantId = FabricConfiguration.tenantId;
			this._clientId = FabricConfiguration.clientId;
			this._authenticationProvider = FabricConfiguration.authenticationProvider;
			this._resourceId = FabricConfiguration.resourceId;

			await this.refreshConnection();

			return true;
		} catch (error) {
			this._connectionTestRunning = false;
			this.Logger.logError(error);
			vscode.window.showErrorMessage(error);
			return false;
		}
	}

	protected static get Logger(): FabricLogger {
		return this._logger;
	}

	private static async refreshConnection(): Promise<void> {
		this._vscodeSession = await this.getVSCodeSession();

		if (!this._vscodeSession || !this._vscodeSession.accessToken) {
			vscode.window.showInformationMessage(`Fabric API Service: Please log in with your Microsoft account first!`);
			return;
		}

		this.Logger.logInfo("Refreshing authentication headers ...");
		this._headers = {
			"Authorization": 'Bearer ' + this._vscodeSession.accessToken,
			"Content-Type": 'application/json',
			"Accept": 'application/json'
		}

		this.Logger.logInfo(`Testing new Fabric API Service settings for user '${this.SessionUser}' (${this.SessionUserId}) ...`);
		this._connectionTestRunning = true;
		let connected = await this.testConnection();
		this._connectionTestRunning = false;

		if (connected) {
			this.Logger.logInfo(`Fabric API Service initialized!`);
			this._isInitialized = true;
		}
		else {
			this.Logger.logError(`Failure initializing Fabric API Service!`);
			throw new Error(`Invalid Configuration for Fabric API Service: Cannot access '${this._apiBaseUrl}' with given credentials'!`);
		}
	}

	public static async getVSCodeSession(): Promise<vscode.AuthenticationSession> {
		// we dont need to specify a clientId here as VSCode is a first party app and can use impersonation by default
		let session = await this.getAADAccessToken([`${Helper.trimChar(this._resourceId, "/")}/.default`], this._tenantId, this._clientId);
		return session;
	}

	private static async _onDidChangeSessions(event: vscode.AuthenticationSessionsChangeEvent) {
		if (event.provider.id === this._authenticationProvider) {
			this.Logger.logInfo("Session for provider '" + event.provider.label + "' changed - refreshing connections! ");

			await this.refreshConnection();
		}
	}

	public static async getAADAccessToken(scopes: string[], tenantId?: string, clientId?: string): Promise<vscode.AuthenticationSession> {
		//https://www.eliostruyf.com/microsoft-authentication-provider-visual-studio-code/

		if (!scopes.includes("offline_access")) {
			scopes.push("offline_access") // Required for the refresh token.
		}
		if (tenantId) {
			scopes.push("VSCODE_TENANT:" + tenantId);
		}

		if (clientId) {
			scopes.push("VSCODE_CLIENT_ID:" + clientId);
		}

		let session: vscode.AuthenticationSession = await vscode.authentication.getSession(this._authenticationProvider, scopes, { createIfNone: true });

		return session;
	}

	public static get SessionUserEmail(): string {
		if (this._vscodeSession) {
			const email = Helper.getFirstRegexGroup(/([\w\.]+@[\w-]+\.+[\w-]{2,5})/gm, this._vscodeSession.account.label);
			if (email) {
				return email;
			}
		}
		return "UNAUTHENTICATED";
	}

	public static get SessionUser(): string {
		if (this._vscodeSession) {
			return this._vscodeSession.account.label;
		}
		return "UNAUTHENTICATED";
	}

	public static get SessionUserId(): string {
		if (this._vscodeSession) {
			return this._vscodeSession.account.id;
		}
		return "UNAUTHENTICATED";
	}

	public static get TenantId(): string {
		return this._tenantId;
	}

	public static get ClientId(): string {
		return this._clientId;
	}

	public static get BrowserBaseUrl(): string {
		return this._apiBaseUrl.replace("api.", "app.");
	}

	public static get ApiBaseUrl(): string {
		return this._apiBaseUrl;
	}

	public static getHeaders(): HeadersInit {
		return this._headers;
	}

	public static async testConnection(): Promise<boolean> {
		this.Logger.logDebug("Testing connection to Fabric API Service ...");
		let workspaceList = await this.get("/v1/workspaces");

		if (workspaceList.success) {
			return true;
		}
		else {
			if (workspaceList.error) {
				this.Logger.logDebug(JSON.stringify(workspaceList.error));
			}
			return false;
		}
	}

	protected static getFullUrl(endpoint: string, params?: object): string {
		let baseItems = this._apiBaseUrl.split("/");
		baseItems = baseItems.concat(["v1"]);
		let pathItems = endpoint.split("/").filter(x => x);

		let index = baseItems.indexOf(pathItems[0]);
		index = index == -1 ? undefined : index; // in case the item was not found, we append it to the baseUrl

		endpoint = (baseItems.slice(undefined, index).concat(pathItems)).join("/");

		let uri = vscode.Uri.parse(endpoint);

		if (params) {
			let urlParams = []
			for (let kvp of Object.entries(params)) {
				urlParams.push(`${kvp[0]}=${kvp[1] as number | string | boolean}`)
			}
			uri = uri.with({ query: urlParams.join('&') })
		}

		return uri.toString(true);
	}

	static async get<TSuccess = any>(
		endpoint: string,
		params: object = null,
		config: iGenericApiCallConfig = { "raw": false, "raiseErrorOnFailure": false }
	): Promise<iGenericApiResponse<TSuccess, iGenericApiError>> {

		if (!this._connectionTestRunning) {
			const connected = await this.Initialization();
			if (!connected) {
				return { "error": { "errorCode": "100", "message": "Service not initialized!" } };
			}
		}

		endpoint = this.getFullUrl(endpoint, params);
		ThisExtension.Logger.logDebug("GET " + endpoint);

		try {
			const requestConfig: RequestInit = {
				method: "GET",
				headers: this.getHeaders(),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, requestConfig);

			if (config.raw) {
				return { "success": response as TSuccess };
			}
			let resultText = await response.text();
			this.logResponse(resultText);

			let success: TSuccess;
			let error: iGenericApiError;

			if (response.ok) {
				if (!resultText || resultText == "") {
					success = { "status": response.status, "statusText": response.statusText } as TSuccess;
				}
				else {
					success = JSON.parse(resultText) as TSuccess;
				}
			}
			else {
				if (!resultText || resultText == "") {
					error = { "errorCode": `${response.status}`, "message": response.statusText };
				}
				else {
					error = { "errorCode": `${response.status}`, "message": resultText, "details": response.statusText };
				}
			}

			if (error && config.raiseErrorOnFailure) {
				throw new Error(error.message);
			}

			return { success: success, error: error } as iGenericApiResponse<TSuccess, iGenericApiError>;

		} catch (error) {
			this.handleApiException(error, false, config.raiseErrorOnFailure);

			return undefined;
		}
	}

	static async getList<TSuccess = any>(
		endpoint: string,
		params: object = null,
		listProperty: string = "value",
		listSortProperty: string = "displayName"
	): Promise<iGenericApiResponse<TSuccess[], iGenericApiError>> {
		let response;
		let ret: TSuccess[] = [];
		do {
			response = await this.get<iFabricListResponse<TSuccess>>(endpoint, params);

			if (response.error) {
				return { "error": response.error };
			}

			ret = ret.concat(response.success[listProperty]);
			endpoint = response.success.continuationUri;
		}
		while (endpoint)

		if (listSortProperty) {
			Helper.sortArrayByProperty(ret, listSortProperty);
		}

		return { "success": ret };
	}

	static async longRunningOperation<TSuccess = any>(
		response: Response,
		maxWaitTimeMS: number = 2000
	): Promise<iGenericApiResponse<TSuccess, iGenericApiError>> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/articles/long-running-operation

		let callback = response.headers.get("location");
		let retryAfter = response.headers.get("retry-after");

		let customWaitMs: number = 100;
		let resultText: string;
		let pollingResult: iFabricPollingResponse;

		while (response.ok && callback) {
			if (callback.endsWith("/result")) {
				// next callback is the result already
				return this.get<TSuccess>(callback);
			}
			else {
				//await Helper.wait(retryAfter ? parseInt(retryAfter) / 10 * 1000 : 1000);
				await Helper.wait(customWaitMs);
				customWaitMs = Math.min(customWaitMs * 2, maxWaitTimeMS);
				let callback_response = await this.get<Response>(callback, undefined, { "raw": true });

				if (callback_response.error) {
					return { error: callback_response.error };
				}

				callback = callback_response.success.headers.get("location");
				retryAfter = callback_response.success.headers.get("retry-after");

				resultText = await callback_response.success.text();
				pollingResult = JSON.parse(resultText) as any as iFabricPollingResponse;

				if (callback_response.success.ok) {
					if (pollingResult["status"] == "Failed") {
						return { error: pollingResult.error ?? pollingResult["failureReason"] };
					}
				}
			}
		}
		return {
			success: pollingResult as TSuccess
		};
	}

	private static async generic<TSuccess = any>(
		method: "POST" | "PATCH" | "PUT" | "DELETE",
		endpoint: string,
		body: object,
		config: iGenericApiCallConfig = { "raw": false, "awaitLongRunningOperation": true }
	): Promise<iFabricApiResponse<TSuccess>> {

		const connected = await this.Initialization();
		if (!connected) {
			return { "error": { "errorCode": "100", "message": "Service not initialized!" } };
		}

		endpoint = this.getFullUrl(endpoint);
		ThisExtension.Logger.logDebug(`${method} ${endpoint} -->  ${JSON.stringify(body) ?? "{}"}`);

		try {
			const requestConfig: RequestInit = {
				method: method,
				headers: this.getHeaders(),
				body: JSON.stringify(body),
				agent: getProxyAgent()
			};
			let response: Response = await fetch(endpoint, requestConfig);

			if (config.raw) {
				return response as any as TSuccess;
			}

			let resultText = await response.text();
			this.logResponse(resultText);

			let success: TSuccess;
			let error: iFabricErrorResponse;

			if (response.ok) {
				if (response.status == 202) {
					if (config.awaitLongRunningOperation) {
						return await this.longRunningOperation<TSuccess>(response, 2000);
					}
					else {
						this.Logger.logInfo("Long Running Operation started! Status available via GET " + response.headers.get("location"));
						success = ({ message: "Long Running Operation started!", url: response.headers.get("location") }) as TSuccess;
					}
				}
				else {
					if (!resultText || resultText == "") {
						success = { "status": response.status, "statusText": response.statusText } as TSuccess;
					}
					else {
						success = JSON.parse(resultText) as TSuccess;
					}
				}
			}
			else {
				if (!resultText || resultText == "") {
					error = { "errorCode": `${response.status}`, "message": response.statusText };
				}
				else {
					error = JSON.parse(resultText) as iFabricErrorResponse;
				}
			}

			if (error && config.raiseErrorOnFailure) {
				throw new Error(error.message);
			}

			return { success: success, error: error } as iGenericApiResponse<TSuccess, iGenericApiError>;

		} catch (error) {
			this.handleApiException(error, false, config.raiseErrorOnFailure);

			return undefined;
		}
	}

	static async post<TSuccess = any>(
		endpoint: string,
		body: object,
		config: iGenericApiCallConfig = { "raw": false, "awaitLongRunningOperation": true }
	): Promise<iFabricApiResponse<TSuccess>> {

		return this.generic<TSuccess>("POST", endpoint, body, config);
	}

	static async delete<T = any>(endpoint: string, body: object): Promise<iFabricApiResponse<T>> {
		return this.generic<T>("DELETE", endpoint, body);
	}

	static async patch<T = any>(endpoint: string, body: object): Promise<iFabricApiResponse<T>> {
		return this.generic<T>("PATCH", endpoint, body);
	}

	static async put<T = any>(endpoint: string, body: object): Promise<iFabricApiResponse<T>> {
		return this.generic<T>("PUT", endpoint, body);
	}

	public static async awaitWithProgress<T>(message: string, promise: Promise<T>, showResultMessage: number = 5000): Promise<T> {
		let ret: T = undefined;

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: message,
			cancellable: false
		}, async (progress: vscode.Progress<any>) => {
			progress.report({ message: " ..." });
			this.Logger.logInfo(message + " ...");

			const start = new Date().getTime();
			let result = await promise;
			const end = new Date().getTime();
			const duration = end - start;
			this.Logger.logInfo(message + " took " + duration + "ms!");

			let resultMessage = `SUCCEEDED after ${Math.round(duration / 1000)}s!`;
			if (result["error"]) {
				resultMessage = `FAILED after ${Math.round(duration / 1000)}s!`;
				this.Logger.logError(JSON.stringify(result["error"]));
				vscode.window.showErrorMessage(JSON.stringify(result["error"]));
			}
			else {
				Helper.showTemporaryInformationMessage(message + ": " + resultMessage, showResultMessage);
			}
			progress.report({ increment: 100, message: resultMessage });

			ret = result;

			return;
		});

		return ret;
	}

	public static get isInitialized(): boolean {
		return this._isInitialized;
	}

	public static async Initialization(timeout: number = 30000): Promise<boolean> {
		if (this.isInitialized) {
			return true;
		}
		// wait 30 seconds for the service to initialize
		const result = await Helper.awaitCondition(async () => this.isInitialized, timeout, 100);

		if (!result) {
			this.Logger.logError("Fabric API Service could not be initialized!");
			return false;
		}
		else {
			this.Logger.logInfo("Fabric API Service initialized!");
			return true;
		}
	}

	protected static async logResponse(response): Promise<void> {
		if (typeof response == "string") {
			this.Logger.logDebug("Response: " + response);
		}
		else {
			this.Logger.logDebug("Response: " + await response.text());
		}
	}

	protected static handleApiException(error: Error, showErrorMessage: boolean = false, raise: boolean = false): void {
		this.Logger.logError(error.name);
		this.Logger.logError(error.message);
		if (error.stack) {
			this.Logger.logError(error.stack);
		}

		if (showErrorMessage) {
			vscode.window.showErrorMessage(error.message);
		}

		if (raise) {
			throw error;
		}
	}

	static async listWorkspaces(): Promise<iFabricApiResponse<iFabricApiWorkspace[]>> {
		const endpoint = `/v1/workspaces`;
		return (await FabricApiService.getList<iFabricApiWorkspace>(endpoint));
	}

	static async getWorkspace(id: string): Promise<iFabricApiResponse<iFabricApiWorkspace>> {
		const endpoint = `/v1/workspaces/${id}`;
		return await FabricApiService.get<iFabricApiWorkspace>(endpoint);
	}

	static async listItems(workspaceId: string, itemType?: FabricApiItemType): Promise<iFabricApiResponse<iFabricApiItem[]>> {
		const endpoint = `/v1/workspaces/${workspaceId}/items`;
		const itemTypeFilter = itemType ? { type: itemType } : undefined;
		return (await FabricApiService.getList<iFabricApiItem>(endpoint, itemTypeFilter));
	}

	static async getItem(workspaceId: string, itemId: string): Promise<iFabricApiResponse<iFabricApiItem>> {
		const endpoint = `/v1/workspaces/${workspaceId}/items/${itemId}`;
		return await FabricApiService.get<iFabricApiItem>(endpoint);
	}

	static async getItemDefinition(workspaceId: string, itemId: string, format?: FabricApiItemFormat): Promise<iFabricApiResponse<iFabricApiItemDefinition>> {
		const endpoint = `/v1/workspaces/${workspaceId}/items/${itemId}/getDefinition`;
		const itemFormat = format && format != FabricApiItemFormat.DEFAULT ? `?format=${format}` : '';

		return await FabricApiService.post<iFabricApiItemDefinition>(endpoint + itemFormat, undefined);
	}

	static async getItemDefinitionParts(workspaceId: string, itemId: string, format?: FabricApiItemFormat): Promise<iFabricApiResponse<iFabricApiItemPart[]>> {
		const ret = await FabricApiService.getItemDefinition(workspaceId, itemId, format)

		if (ret.error) {
			return { error: ret.error };
		}
		else {
			return { success: ret.success.definition.parts };
		}
	}

	static async updateItemDefinition(workspaceId: string, itemId: string, itemDefinition: iFabricApiItemDefinition, progressText: string = "Creating Item"): Promise<iFabricApiResponse> {
		const endpoint = `/v1/workspaces/${workspaceId}/items/${itemId}/updateDefinition`;

		return await FabricApiService.awaitWithProgress(progressText, FabricApiService.post(endpoint, itemDefinition), 3000);
	}

	static async updateItem(workspaceId: string, itemId: string, newName?: string, newDescription?: string): Promise<iFabricApiResponse> {
		const endpoint = `/v1/workspaces/${workspaceId}/items/${itemId}`;

		const body = {};

		if (newName) {
			body["displayName"] = newName;
		}
		if (newDescription) {
			body["description"] = newDescription;
		}

		if (Object.keys(body).length > 0) {
			return FabricApiService.patch<iFabricApiItem>(endpoint, body);
		}
		return { success: "No Changes!" };
	}

	static async createItem(workspaceId: string, name: string, type: FabricApiItemType, definition?: iFabricApiItemDefinition, progressText: string = "Publishing Item"): Promise<iFabricApiResponse> {
		if(!TYPES_WITH_DEFINITION.includes(type))
		{
			ThisExtension.Logger.logError(`Type '${type}' is not supported for item creation!`, true, true);
		}
		
		const endpoint = `${this._apiBaseUrl}/v1/workspaces/${workspaceId}/${type}`;

		const body = Object.assign({}, {
			displayName: name
		}, definition)

		return await FabricApiService.awaitWithProgress(progressText, FabricApiService.post<iFabricApiItem>(endpoint, body), 3000);
	}

	static async deleteItem(workspaceId: string, itemId: string, progressText: string = "Deleting Item"): Promise<iFabricApiResponse> {
		const endpoint = `${this._apiBaseUrl}/v1/workspaces/${workspaceId}/items/${itemId}`;

		return await FabricApiService.awaitWithProgress(progressText, FabricApiService.delete<any>(endpoint, undefined), 3000);
	}
}
