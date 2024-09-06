import * as vscode from 'vscode';

import { ENVIRONMENT } from './env/node/env';
import { FabricLogger } from '@utils/FabricLogger';
import { FabricConfiguration } from './vscode/configuration/FabricConfiguration';
import { FabricApiService } from './fabric/FabricApiService';
import { FabricApiTreeItem } from './vscode/treeviews/FabricApiTreeItem';
import { FabricNotebookKernel } from './vscode/notebook/FabricNotebookKernel';
import { FabricWorkspacesTreeProvider } from './vscode/treeviews/Workspaces/FabricWorkspacesTreeProvider';
import { FabricFileSystemProvider } from './vscode/filesystemProvider/FabricFileSystemProvider';
import { FabricPipelinesTreeProvider } from './vscode/treeviews/Pipelines/FabricPipelinesTreeProvider';
import { Helper } from '@utils/Helper';
import { FabricWorkspaceTreeItem } from './vscode/treeviews/Workspaces/FabricWorkspaceTreeItem';
import { TempFileSystemProvider } from './vscode/filesystemProvider/temp/TempFileSystemProvider';


export type TreeProviderId =
	"application/vnd.code.tree.fabricstudioworkspaces"
	| "application/vnd.code.tree.fabricstudiocapacities"
	| "application/vnd.code.tree.fabricstudiopipelines"
	;

const LOGGER_NAME = "Fabric Studio"

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export abstract class ThisExtension {

	private static _context: vscode.ExtensionContext;
	private static _extension: vscode.Extension<any>;
	private static _isValidated: boolean = false;
	private static _logger: FabricLogger;
	private static _isVirtualWorkspace: boolean = undefined;
	private static _statusBarRight: vscode.StatusBarItem;
	private static _statusBarLeft: vscode.StatusBarItem;

	private static _notebookKernel: FabricNotebookKernel;
	private static _treeviewWorkspaces: FabricWorkspacesTreeProvider;
	private static _treeviewPipelines: FabricPipelinesTreeProvider;
	private static _fabricFileSystemProvider: FabricFileSystemProvider;
	private static _tempFileSystemProvider: TempFileSystemProvider;

	static async initialize(context: vscode.ExtensionContext): Promise<boolean> {
		try {
			this._extension = context.extension;
			this.Logger.log(`Loading VS Code extension '${context.extension.packageJSON.displayName}' (${context.extension.id}) version ${context.extension.packageJSON.version} ...`);
			this.Logger.log(`If you experience issues please open a ticket at ${context.extension.packageJSON.qna}`);
			this._context = context;

			let config = FabricConfiguration;
			config.applySettings();
			await FabricApiService.initialize();

			this._notebookKernel = await FabricNotebookKernel.getInstance();

			await this.setContext();
			return true;
		} catch (error) {
			return false;
		}
	}

	static async initializeLogger(context: vscode.ExtensionContext): Promise<void> {
		if (!this._logger) {
			this._logger = new FabricLogger(context, LOGGER_NAME, FabricConfiguration.logLevel);
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

	// #region TreeViews
	static set TreeViewWorkspaces(treeView: FabricWorkspacesTreeProvider) {
		this._treeviewWorkspaces = treeView;
	}

	static get TreeViewWorkspaces(): FabricWorkspacesTreeProvider {
		return this._treeviewWorkspaces;
	}

	static set TreeViewPipelines(treeView: FabricPipelinesTreeProvider) {
		this._treeviewPipelines = treeView;
	}

	static get TreeViewPipelines(): FabricPipelinesTreeProvider {
		return this._treeviewPipelines;
	}
	//#endregion

	// #region FileSystemProviders
	static set FabricFileSystemProvider(provider: FabricFileSystemProvider) {
		this._fabricFileSystemProvider = provider;
	}
	static get FabricFileSystemProvider(): FabricFileSystemProvider {
		return this._fabricFileSystemProvider;
	}

	static set TempFileSystemProvider(provider: TempFileSystemProvider) {
		this._tempFileSystemProvider = provider;
	}
	static get TempFileSystemProvider(): TempFileSystemProvider {
		return this._tempFileSystemProvider;
	}
	// #endregion

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

	static async refreshTreeView(id: string, item: FabricApiTreeItem = null,): Promise<void> {
		throw new Error("Method not implemented.");
		/*
		switch (id) {
			case "application/vnd.code.tree.powerbiworkspaces":
				await this.TreeViewWorkspaces.refresh(item as ApiTreeItem);
			case "application/vnd.code.tree.powerbicapacities":
				await this.TreeViewCapacities.refresh(item as ApiTreeItem);
			case "application/vnd.code.tree.powerbigateways":
				await this.TreeViewGateways.refresh(item as ApiTreeItem);
			case "application/vnd.code.tree.powerbipipelines":
				await this.TreeViewPipelines.refresh(item as ApiTreeItem);
			case "application/vnd.code.tree.fabricworkspaces":
				await this.TreeViewFabric.refresh(item as ApiTreeItem);
		}
		*/
	}

	static PushDisposable(item: any) {
		this.extensionContext.subscriptions.push(item);
	}

	static get NotebookKernel(): FabricNotebookKernel {
		return this._notebookKernel;
	}

	static async browseInOneLake(treeItem: FabricWorkspaceTreeItem): Promise<void> {
		const databricksExtension: vscode.Extension<any> = vscode.extensions.getExtension("GerhardBrueckl.onelake-vscode");
		if (!databricksExtension) {
			vscode.window.showErrorMessage("Please install the OneLake VSCode extension ('GerhardBrueckl.onelake-vscode') first!");
			// TODO
			/*
			You can trigger the installation using the workbench.extensions.installExtension command (see https://code.visualstudio.com/api/references/commands).
			*/
			return;
		}

		Helper.addToWorkspace(treeItem.oneLakeUri, `OneLake - ${treeItem.label}`, true, true);
	}
}



