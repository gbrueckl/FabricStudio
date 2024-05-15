import * as vscode from 'vscode';

import { ENVIRONMENT } from './env/node/env';
import { FabricLogger } from '@utils/FabricLogger';
import { CoreConfiguration } from './vscode/configuration/CoreConfiguration';
import { FabricApiService } from './fabric/FabricApiService';


export type TreeProviderId =
	"application/vnd.code.tree.powerbiworkspaces"
	| "application/vnd.code.tree.powerbicapacities"
	| "application/vnd.code.tree.powerbigateways"
	| "application/vnd.code.tree.powerbipipelines"
;

const LOGGER_NAME = "Fabric.Core"
export const REPO_PATH = "./packages/Core";

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export abstract class Core {

	private static _context: vscode.ExtensionContext;
	private static _extension: vscode.Extension<any>;
	private static _isValidated: boolean = false;
	private static _logger: FabricLogger;
	private static _isVirtualWorkspace: boolean = undefined;
	private static _statusBarRight: vscode.StatusBarItem;
	private static _statusBarLeft: vscode.StatusBarItem;

	static async initialize(context: vscode.ExtensionContext): Promise<boolean> {
		try {
			this._extension = context.extension;
			this.Logger.log(`Loading VS Code extension '${context.extension.packageJSON.displayName}' (${context.extension.id}) version ${context.extension.packageJSON.version} ...`);
			this.Logger.log(`If you experience issues please open a ticket at ${context.extension.packageJSON.qna}`);
			this._context = context;

			let config = CoreConfiguration;
			config.applySettings();
			await FabricApiService.initialize();

			await this.setContext();
			return true;
		} catch (error) {
			return false;
		}
	}

	static async initializeLogger(context: vscode.ExtensionContext): Promise<void> {
		if (!this._logger) {
			this._logger = new FabricLogger(context, LOGGER_NAME, CoreConfiguration.logLevel);
		}
	}

	private static async setContext(): Promise<void> {
		// we hide the Connections Tab as we load all information from the Databricks Extension
		vscode.commands.executeCommand(
			"setContext",
			"Fabric.Core.isInBrowser",
			this.isInBrowser
		);
	}

	static get rootUri(): vscode.Uri {
		return this.extensionContext.extensionUri;
	}

	static get extensionContext(): vscode.ExtensionContext {
		return this._context;
	}

	static set extensionContext(value: vscode.ExtensionContext) {
		this._context = value;
	}

	static get secrets(): vscode.SecretStorage {
		return this.extensionContext.secrets;
	}

	static get RefreshAfterUpDownload(): boolean {
		return true;
	}

	static get IsValidated(): boolean {
		return this._isValidated;
	}

	// #region StatusBar
	static set StatusBarRight(value: vscode.StatusBarItem) {
		this._statusBarRight = value;
	}

	static get StatusBarRight(): vscode.StatusBarItem {
		return this._statusBarRight;
	}

	static setStatusBarRight(text: string, inProgress: boolean = false): void {
		if (inProgress) {
			this.StatusBarRight.text = "$(loading~spin) " + text;
		}
		else {
			this.StatusBarRight.text = text;
		}
	}

	static set StatusBarLeft(value: vscode.StatusBarItem) {
		this._statusBarLeft = value;
	}

	static get StatusBarLeft(): vscode.StatusBarItem {
		return this._statusBarLeft;
	}

	static updateStatusBarLeft(): void {
		// const tenantInfo = PowerBIApiService.TenantId ? `Tenant: ${PowerBIApiService.TenantId}` : "";
		// this.StatusBarLeft.text = `Power BI: ${PowerBIApiService.SessionUserEmail}${tenantInfo ? " (GUEST)" : ""}`;
		// this.StatusBarLeft.tooltip = tenantInfo ? `${tenantInfo}` : undefined;
	}

	static cleanUp(): void {

	}

	static get Logger(): FabricLogger {
		return this._logger;
	}

	static get configuration(): vscode.Extension<any> {
		return this._extension;
	}

	static async getSecureSetting(setting: string): Promise<string> {
		let value = this.secrets.get(setting); // new way to store secrets

		return value;
	}

	static async setSecureSetting(setting: string, value: string): Promise<void> {
		// changing the way we store secrets and make sure we are backward compatible
		await this.secrets.store(setting, value);
	}

	static get isVirtualWorkspace(): boolean {
		if (this._isVirtualWorkspace == undefined) {
			// from https://github.com/microsoft/vscode/wiki/Virtual-Workspaces#detect-virtual-workspaces-in-code
			this._isVirtualWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.every(f => f.uri.scheme !== 'file')
		}

		return this._isVirtualWorkspace;
	}

	static get isInBrowser(): boolean {
		return ENVIRONMENT == "web";
	}
}



