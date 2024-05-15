import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { FabricLogger } from '@utils/FabricLogger';
import { iGenericApiResponse, iGenericApiError, iGenericApiCallConfig } from '@utils/_types'

export abstract class GenericApiService {
	protected static _logger: FabricLogger;
	protected static _apiServiceName: string = "Generic API Service";
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
		apiServiceName: string,
		// Default settings will be for Azure Global
		apiBaseUrl: string,
		tenantId: string,
		clientId: string,
		logger: FabricLogger,
		authenticationProvider: string,
		resourceId: string
	): Promise<boolean> {

		try {
			this._logger = logger;
			this.Logger.log(`Initializing ${apiServiceName} API Service ...`);

			vscode.authentication.onDidChangeSessions((event) => this._onDidChangeSessions(event));

			this._apiServiceName = apiServiceName;
			this._apiBaseUrl = Helper.trimChar(apiBaseUrl, '/');
			this._tenantId = tenantId;
			this._clientId = clientId;
			this._authenticationProvider = authenticationProvider;
			this._resourceId = resourceId;

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
			vscode.window.showInformationMessage(`${this._apiServiceName} API Service: Please log in with your Microsoft account first!`);
			return;
		}

		this.Logger.logInfo("Refreshing authentication headers ...");
		this._headers = {
			"Authorization": 'Bearer ' + this._vscodeSession.accessToken,
			"Content-Type": 'application/json',
			"Accept": 'application/json'
		}

		this.Logger.logInfo(`Testing new ${this._apiServiceName} API Service settings for user '${this.SessionUser}' (${this.SessionUserId}) ...`);
		this._connectionTestRunning = true;
		let connected = await this.testConnection();
		this._connectionTestRunning = false;

		if (connected) {
			this.Logger.logInfo(`${this._apiServiceName} API Service initialized!`);
			this._isInitialized = true;
		}
		else {
			this.Logger.logInfo(`Failure initializing ${this._apiServiceName} API Service!`);
			throw new Error(`Invalid Configuration for ${this._apiServiceName} API Service: Cannot access '${this._apiBaseUrl}' with given credentials'!`);
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

	public static getHeaders(): HeadersInit {
		return this._headers;
	}

	public static async testConnection(): Promise<boolean> {
		throw new Error("Method not implemented.");
	}

	protected static getFullUrl(endpoint: string, params?: object, staticBaseItems?: string[]): string {

		let baseItems = this._apiBaseUrl.split("/");
		baseItems.concat(staticBaseItems ?? []);
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

	abstract get<TSuccess = any, TError = iGenericApiError>(endpoint: string, params?: object, config?: iGenericApiCallConfig): Promise<iGenericApiResponse<TSuccess, TError>>;

	abstract getList<TSuccess = any[], TError = iGenericApiError>(endpoint: string, params: object, listProperty: string): Promise<iGenericApiResponse<TSuccess, TError>>;

	abstract post<TSuccess = any, TError = iGenericApiError>(endpoint: string, body: object, config?: iGenericApiCallConfig): Promise<iGenericApiResponse<TSuccess, TError>>;

	abstract delete<TSuccess = any, TError = iGenericApiError>(endpoint: string, body: object, config?: iGenericApiCallConfig): Promise<iGenericApiResponse<TSuccess, TError>>;

	abstract patch<TSuccess = any, TError = iGenericApiError>(endpoint: string, body: object, config?: iGenericApiCallConfig): Promise<iGenericApiResponse<TSuccess, TError>>;

	abstract put<TSuccess = any, TError = iGenericApiError>(endpoint: string, body: object, config?: iGenericApiCallConfig): Promise<iGenericApiResponse<TSuccess, TError>>;

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
			progress.report({ increment: 100, message: resultMessage });

			Helper.showTemporaryInformationMessage(message + ": " + resultMessage, showResultMessage);

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
		const result = Helper.awaitCondition(async () => this.isInitialized, timeout, 100);

		if (!result) {
			this.Logger.logError("Fabric API Service could not be initialized!");
			return false;
		}
		else {
			this.Logger.logInfo("Fabric API Service initialized!");
			return true;
		}
	}

	protected static async logResponse(response: any): Promise<void> {
		if (typeof response == "string") {
			this.Logger.logDebug("Response: " + response);
		}
		else {
			this.Logger.logDebug("Response: " + JSON.stringify(response));
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
}