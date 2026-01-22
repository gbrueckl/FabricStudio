import * as vscode from 'vscode';

import { ENVIRONMENT } from './env/node/env';
import { Helper } from '@utils/Helper';
import { FabricLogger } from '@utils/FabricLogger';

import { FabricConfiguration } from './vscode/configuration/FabricConfiguration';
import { FabricApiService } from './fabric/FabricApiService';
import { FabricApiTreeItem } from './vscode/treeviews/FabricApiTreeItem';
import { FabricApiNotebookKernel } from './vscode/notebook/api/FabricApiNotebookKernel';
import { FabricWorkspacesTreeProvider } from './vscode/treeviews/Workspaces/FabricWorkspacesTreeProvider';
import { FabricFileSystemProvider } from './vscode/filesystemProvider/FabricFileSystemProvider';
import { FabricPipelinesTreeProvider } from './vscode/treeviews/Pipelines/FabricPipelinesTreeProvider';
import { FabricWorkspaceTreeItem } from './vscode/treeviews/Workspaces/FabricWorkspaceTreeItem';
import { TempFileSystemProvider } from './vscode/filesystemProvider/temp/TempFileSystemProvider';
import { FabricPipelineTreeItem } from './vscode/treeviews/Pipelines/FabricPipelineTreeItem';
import { FabricConnectionsTreeProvider } from './vscode/treeviews/Connections/FabricConnectionsTreeProvider';
import { FabricCapacitiesTreeProvider } from './vscode/treeviews/Capacities/FabricCapacitiesTreeProvider';
import { FabricConnectionTreeItem } from './vscode/treeviews/Connections/FabricConnectionTreeItem';
import { FabricCapacityTreeItem } from './vscode/treeviews/Capacities/FabricCapacityTreeItem';
import { FabricAdminTreeProvider } from './vscode/treeviews/Admin/FabricAdminTreeProvider';
import { FabricAdminTreeItem } from './vscode/treeviews/Admin/FabricAdminTreeItem';

import { IArtifactManager, IFabricApiClient, IFabricExtensionServiceCollection, IWorkspaceManager } from '@microsoft/vscode-fabric-api';



export type TreeProviderId =
	"application/vnd.code.tree.fabricstudioworkspaces"
	| "application/vnd.code.tree.fabricstudiodeploymentpipelines"
	| "application/vnd.code.tree.fabricstudioconnections"
	| "application/vnd.code.tree.fabricstudiocapacities"
	| "application/vnd.code.tree.fabricstudioadmin"
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

	private static _notebookKernel: FabricApiNotebookKernel;
	private static _treeviewWorkspaces: FabricWorkspacesTreeProvider;
	private static _treeviewPipelines: FabricPipelinesTreeProvider;
	private static _treeviewConnections: FabricConnectionsTreeProvider;
	private static _treeviewCapacities: FabricCapacitiesTreeProvider;
	private static _treeviewAdmin: FabricAdminTreeProvider;
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

			this._notebookKernel = await FabricApiNotebookKernel.getInstance();

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

	private static _services: IFabricExtensionServiceCollection;

    public static set services(services: IFabricExtensionServiceCollection) {
        ThisExtension._services = services;
    }

    public static get artifactManager(): IArtifactManager {
        return ThisExtension._services.artifactManager;
    }

    public static get workspaceManager(): IWorkspaceManager {
        return ThisExtension._services.workspaceManager;
    }

    public static get apiClient(): IFabricApiClient {
        return ThisExtension._services.apiClient;
    }

	private static async setContext(): Promise<void> {
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
		const tenantInfo = FabricApiService.TenantId != FabricApiService.SessionUserTenantId ? `Tenant: ${FabricApiService.TenantId}` : "";
		this.StatusBarLeft.text = `Fabric Studio: ${FabricApiService.SessionUserEmail}${tenantInfo ? " (GUEST)" : ""}`;
		this.StatusBarLeft.tooltip = tenantInfo ? `${tenantInfo}` : undefined;
	}

	public static async refreshUI(): Promise<void> {
		// refresh all treeviews after the extension has been initialized
		const allCommands = await vscode.commands.getCommands(true);
		const refreshCommands = allCommands.filter(command => command.match(/^(FabricStudio).*?s\.refresh/));

		ThisExtension.Logger.logInfo("Refreshing UI ...");
		for (let command of refreshCommands) {
			ThisExtension.Logger.logInfo(`Executing command '${command}' ...`);
			vscode.commands.executeCommand(command, undefined, false);
		}
		ThisExtension.updateStatusBarLeft();
		ThisExtension.Logger.logInfo("UI refresh finsihed!");
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
	public static get TreeProviderIdsForDragAndDrop(): TreeProviderId[] {
		return [
			"application/vnd.code.tree.fabricstudioworkspaces",
			"application/vnd.code.tree.fabricstudiodeploymentpipelines",
			"application/vnd.code.tree.fabricstudiocapacities"
		];
	}

	public static getTreeProvider(id: TreeProviderId): vscode.TreeDataProvider<FabricApiTreeItem> {
		switch (id) {
			case "application/vnd.code.tree.fabricstudioworkspaces":
				return this.TreeViewWorkspaces;
			case "application/vnd.code.tree.fabricstudiodeploymentpipelines":
				return this.TreeViewPipelines;
			case "application/vnd.code.tree.fabricstudioconnections":
				return this.TreeViewPipelines;
			case "application/vnd.code.tree.fabricstudiocapacities":
				return this.TreeViewCapacities;
			case "application/vnd.code.tree.fabricstudioadmin":
				return this.TreeViewCapacities;
		}
	}

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

	static set TreeViewConnections(treeView: FabricConnectionsTreeProvider) {
		this._treeviewConnections = treeView;
	}

	static get TreeViewConnections(): FabricConnectionsTreeProvider {
		return this._treeviewConnections;
	}

	static set TreeViewCapacities(treeView: FabricCapacitiesTreeProvider) {
		this._treeviewCapacities = treeView;
	}

	static get TreeViewCapacities(): FabricCapacitiesTreeProvider {
		return this._treeviewCapacities;
	}

	static set TreeViewAdmin(treeView: FabricAdminTreeProvider) {
		this._treeviewAdmin = treeView;
	}

	static get TreeViewAdmin(): FabricAdminTreeProvider {
		return this._treeviewAdmin;
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

	static async refreshTreeView(id: TreeProviderId, item: FabricApiTreeItem = null): Promise<void> {
		switch (id) {
			case "application/vnd.code.tree.fabricstudioworkspaces":
				await this.TreeViewWorkspaces.refresh(item as FabricWorkspaceTreeItem);
				break;
			case "application/vnd.code.tree.fabricstudiodeploymentpipelines":
				await this.TreeViewPipelines.refresh(item as FabricPipelineTreeItem);
				break;
			case "application/vnd.code.tree.fabricstudioconnections":
				await this.TreeViewConnections.refresh(item as FabricConnectionTreeItem);
				break;
			case "application/vnd.code.tree.fabricstudiocapacities":
				await this.TreeViewCapacities.refresh(item as FabricCapacityTreeItem);
				break;
			case "application/vnd.code.tree.fabricstudioadmin":
				await this.TreeViewAdmin.refresh(item as FabricAdminTreeItem);
				break;
			default:
				this.Logger.logError(`TreeProviderId '${id}' not found!`, true, true);
				throw new Error(`TreeProviderId '${id}' not found!`);
		}
	}

	static PushDisposable(item: any) {
		this.extensionContext.subscriptions.push(item);
	}

	static get NotebookKernel(): FabricApiNotebookKernel {
		return this._notebookKernel;
	}

	static async openInMSSQLExtension(server: string, database: string, properties: { [key: string]: string } = {}): Promise<void> {
		const extensionId = "ms-mssql.mssql";
		const mssqlExtensionInstalled = await Helper.ensureExtensionInstalled(extensionId, "MS-SQL");

		if (!mssqlExtensionInstalled) {
			return;
		}

		ThisExtension.Logger.logInfo(`Opening MS SQL Extension for server '${server}' and database '${database}' ...`);
		let uri = vscode.Uri.parse(`vscode://${extensionId}/connect?server=${server}&database=${database}&authenticationType=AzureMFA`);

		let baseProperties = {
			"server": server,
			"database": database,
			"email": FabricApiService.SessionUserEmail,
			"accountId": FabricApiService.SessionUserId,
			"authenticationType": "AzureMFA"
		};
		if(FabricApiService.TenantId){
			baseProperties["tenantId"] = FabricApiService.TenantId;
		}
		let query = { ...properties, ...baseProperties };

		const mssqlUri = vscode.Uri.parse(`vscode://${extensionId}/connect?${new URLSearchParams(query).toString()}`);

		Helper.openLink(mssqlUri);
	}

	// #region GlobalState
	static getGlobalState<T>(key: string): T | undefined {
		return this.extensionContext.globalState.get<T>(key);
	}

	static async setGlobalState(key: string, value: any): Promise<void> {
		await this.extensionContext.globalState.update(key, value);
	}
	// #endregion
}



