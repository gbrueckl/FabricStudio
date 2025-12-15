'use strict';

import * as vscode from 'vscode';
import { ThisExtension } from './ThisExtension';
import { FabricApiNotebookSerializer } from './vscode/notebook/api/FabricApiNotebookSerializer';
import { FabricApiTreeItem } from './vscode/treeviews/FabricApiTreeItem';
import { FabricCommandBuilder } from './vscode/input/FabricCommandBuilder';
import { FabricWorkspacesTreeProvider } from './vscode/treeviews/Workspaces/FabricWorkspacesTreeProvider';
import { FabricWorkspaceTreeItem } from './vscode/treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FabricLakehouseTable } from './vscode/treeviews/Workspaces/FabricLakehouseTable';
import { FABRIC_SCHEME, FabricFileSystemProvider } from './vscode/filesystemProvider/FabricFileSystemProvider';
import { FabricFSFileDecorationProvider } from './vscode/fileDecoration/FabricFileDecorationProvider';
import { FabricFSUri } from './vscode/filesystemProvider/FabricFSUri';
import { FabricFSCache } from './vscode/filesystemProvider/FabricFSCache';
import { FabricGitRepositories } from './vscode/sourceControl/FabricGitRepositories';
import { FabricWorkspace } from './vscode/treeviews/Workspaces/FabricWorkspace';
import { FabricNotebookContext } from './vscode/notebook/api/FabricNotebookContext';
import { FabricPipelinesTreeProvider } from './vscode/treeviews/Pipelines/FabricPipelinesTreeProvider';
import { FabricPipelineTreeItem } from './vscode/treeviews/Pipelines/FabricPipelineTreeItem';
import { TempFileSystemProvider } from './vscode/filesystemProvider/temp/TempFileSystemProvider';
import { FabricWorkspaceGenericViewer } from './vscode/treeviews/Workspaces/FabricWorkspaceGenericViewer';
import { FabricGraphQLApi } from './vscode/treeviews/Workspaces/FabricGraphQLApi';
import { FabricNotebook } from './vscode/treeviews/Workspaces/FabricNotebook';
import { FabricItem } from './vscode/treeviews/Workspaces/FabricItem';
import { FabricDataPipeline } from './vscode/treeviews/Workspaces/FabricDataPipeline';
import { FabricSparkJob } from './vscode/treeviews/Workspaces/FabricSparkJob';
import { FabricWorkspaceRoleAssignment } from './vscode/treeviews/Workspaces/FabricWorkspaceRoleAssignment';
import { FabricConnectionsTreeProvider } from './vscode/treeviews/Connections/FabricConnectionsTreeProvider';
import { FabricConnectionTreeItem } from './vscode/treeviews/Connections/FabricConnectionTreeItem';
import { FabricMirroredDatabaseSynchronization } from './vscode/treeviews/Workspaces/FabricMirroredDatabaseSynchronization';
import { FabricCapacitiesTreeProvider } from './vscode/treeviews/Capacities/FabricCapacitiesTreeProvider';
import { FabricCapacityTreeItem } from './vscode/treeviews/Capacities/FabricCapacityTreeItem';
import { FabricSqlEndpoint } from './vscode/treeviews/Workspaces/FabricSqlEndpoint';
import { FabricApiService } from './fabric/FabricApiService';
import { FabricFSHelper } from './vscode/filesystemProvider/FabricFSHelper';
import { FabricAdminTreeProvider } from './vscode/treeviews/Admin/FabricAdminTreeProvider';
import { FabricAdminTreeItem } from './vscode/treeviews/Admin/FabricAdminTreeItem';
import { FabricAdminGenericViewer } from './vscode/treeviews/Admin/FabricAdminGenericViewer';
import { FabricReport } from './vscode/treeviews/Workspaces/FabricReport';
import { FabricSemanticModel } from './vscode/treeviews/Workspaces/FabricSemanticModel';
import { FabricAPICompletionProvider } from './vscode/language/FabricAPICompletionProvider';
import { FabricWorkspaceFolder } from './vscode/treeviews/Workspaces/FabricWorkspaceFolder';
import { FabricWarehouse } from './vscode/treeviews/Workspaces/FabricWarehouse';
import { FabricSQLItem } from './vscode/treeviews/Workspaces/FabricSQLItem';
import { FabricUriHandler } from './vscode/uriHandler/FabricUriHandler';
import { FabricWarehouseRestorePoint } from './vscode/treeviews/Workspaces/FabricWarehouseRestorePoint';
import { FABRIC_API_NOTEBOOK_TYPE } from './vscode/notebook/api/FabricApiNotebookKernel';
import { FabricSparkKernelManager } from './vscode/notebook/spark/FabricSparkKernelManager';
import { FabricSqlDatabaseMirroring } from './vscode/treeviews/Workspaces/FabricSqlDatabaseMirroring';
import { FabricGUIDHoverProvider } from './vscode/hoverProvider/FabricGUIDHoverProvider';

export async function activate(context: vscode.ExtensionContext) {

	await ThisExtension.initializeLogger(context);

	const prevInstalledVersion = context.globalState.get<vscode.Extension<any>>(`${context.extension.id}.installedVersion`, undefined);
	if (!prevInstalledVersion || prevInstalledVersion.packageJSON.version !== context.extension.packageJSON.version) {
		context.globalState.update(`${context.extension.id}.installedVersion`, context.extension);
		const action = vscode.window.showInformationMessage(`${context.extension.packageJSON.displayName} updated to version ${context.extension.packageJSON.version}`, "Change Log");

		action.then((value) => {
			if (value == "Change Log") {
				vscode.env.openExternal(vscode.Uri.parse(`${context.extension.packageJSON.repository.url}/blob/main/CHANGELOG.md`));
			}
		});
	}

	// some of the following code needs the context before the initialization already
	ThisExtension.extensionContext = context;

	ThisExtension.StatusBarRight = vscode.window.createStatusBarItem("fabricstudio.right", vscode.StatusBarAlignment.Right);
	// Core.StatusBarRight.show();
	// Core.setStatusBarRight("Initialized!");

	ThisExtension.StatusBarLeft = vscode.window.createStatusBarItem("fabricstudio.left", vscode.StatusBarAlignment.Left);
	ThisExtension.StatusBarLeft.show();
	ThisExtension.StatusBarLeft.command = "FabricStudio.changeUser";

	vscode.commands.registerCommand('FabricStudio.initialize', async () => {
		let isValidated: boolean = await ThisExtension.initialize(context)
		if (!isValidated) {
			ThisExtension.Logger.logInfo(`Error initializing ${context.extension.packageJSON.displayName}  - Please update your settings and restart VSCode!`);
			vscode.window.showErrorMessage(`Error initializing ${context.extension.packageJSON.displayName}  - Please update your settings and restart VSCode!`);
		}
		return isValidated;
	}
	);

	await vscode.commands.executeCommand('FabricStudio.initialize');

	vscode.commands.registerCommand('FabricStudio.changeUser', FabricApiService.changeUser);

	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			FABRIC_API_NOTEBOOK_TYPE, new FabricApiNotebookSerializer(), { transientOutputs: true }
		)
	);

	//#region Fabric FileSystemProvider
	FabricFileSystemProvider.register(context);
	FabricFSFileDecorationProvider.register(context);

	TempFileSystemProvider.register(context);

	//#endregion

	FabricGUIDHoverProvider.register(context);


	vscode.workspace.onDidOpenNotebookDocument(async (e) => {
		if (e.uri.scheme === FABRIC_SCHEME) {
			ThisExtension.Logger.logInfo("Detected Fabric Notebook - waiting until extension is started ...");
			// initilization is triggered by getHeaders()
			await FabricApiService.getHeaders();
		}
		// the metadata of an notebook is immutable - so we need to track the context of the notebook here
		if (e.notebookType == FABRIC_API_NOTEBOOK_TYPE) {
			// for our Fabric notebooks we always have a GUID in the metadata which we use manage the context
			const metadata = FabricNotebookContext.get(e.metadata.guid.toString());

			// store the URI of the opened notebook as this is the only refernce we have in the kernel
			metadata.uri = e.uri;

			FabricNotebookContext.set(e.metadata.guid, metadata);
		}
		else if (e.notebookType == "jupyter-notebook") {
			// for Jupyter notebooks we do not have a GUID in the metadata - so we use the URI as key
			try {
				ThisExtension.Logger.logInfo("Detected Spark Jupyter Notebook - trying to create Kernels ...");
				const lakehouseConfig = e.metadata.metadata?.dependencies?.lakehouse;

				await FabricSparkKernelManager.createKernels(
					{
						"id": lakehouseConfig?.default_lakehouse,
						"workspaceId": lakehouseConfig?.default_lakehouse_workspace_id,
						"displayName": lakehouseConfig?.default_lakehouse_name,
						"type": "Lakehouse"
					}
				)
			} catch {
				ThisExtension.Logger.logWarning("Error creating Kernels for Spark Jupyter Notebook - please make sure that the notebook contains the lakehouse configuration!");
			}
		}
	});

	vscode.commands.registerCommand('FabricStudio.Notebook.restartSession',
		(notebook: { notebookEditor: { notebookUri: vscode.Uri } } | undefined | vscode.Uri) => FabricSparkKernelManager.restartNotebookSession(notebook)
	);
	vscode.commands.registerCommand('FabricStudio.Notebook.stopSession',
		(notebook: { notebookEditor: { notebookUri: vscode.Uri } } | undefined | vscode.Uri) => FabricSparkKernelManager.stopNotebookSession(notebook)
	);

	const completionProvider = new FabricAPICompletionProvider(context);

	vscode.commands.registerCommand('FabricStudio.FS.publishToFabric', (uri) => FabricFSCache.publishToFabric(uri, true));
	vscode.commands.registerCommand('FabricStudio.FS.reloadFromFabric', (uri) => FabricFSCache.reloadFromFabric(uri));
	vscode.commands.registerCommand('FabricStudio.FS.openInFabric', (uri) => FabricFSUri.openInBrowser(uri));
	// Publishing of local items to Fabric (e.g. from a Git-Repository, or PBI Desktop)
	vscode.commands.registerCommand('FabricStudio.FS.publishItem', (uri) => FabricFSHelper.publishItemFromLocal(uri));

	//#endregion

	//#region Fabric Workspaces TreeView
	vscode.commands.registerCommand('FabricStudio.updateQuickPickList', (treeItem: FabricApiTreeItem) => FabricCommandBuilder.pushQuickPickApiItem(treeItem));
	vscode.commands.registerCommand('FabricStudio.Item.openNewNotebook', (treeItem: FabricApiTreeItem) => FabricApiNotebookSerializer.openNewNotebook(treeItem));

	let fabricWorkspacesTreeProvider = new FabricWorkspacesTreeProvider(context);
	vscode.commands.registerCommand('FabricStudio.Workspaces.refresh', (item: FabricWorkspaceTreeItem = undefined, showInfoMessage: boolean = true) => fabricWorkspacesTreeProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Workspaces.filter', () => fabricWorkspacesTreeProvider.filter());
	vscode.commands.registerCommand('FabricStudio.Workspaces.editItems', (item: FabricWorkspaceTreeItem = undefined) => item.editItems());
	vscode.commands.registerCommand('FabricStudio.Workspaces.deleteItems', () => fabricWorkspacesTreeProvider.deleteSelectedItems());


	vscode.commands.registerCommand('FabricStudio.Workspace.rename', (item: FabricWorkspaceTreeItem = undefined) => item.rename());
	vscode.commands.registerCommand('FabricStudio.Workspace.createFolder', (item: FabricWorkspaceTreeItem = undefined) => FabricWorkspaceFolder.createFolder(item));
	vscode.commands.registerCommand('FabricStudio.Workspace.manageSourceControl', (item: FabricWorkspace) => item.manageSourceControl());
	vscode.commands.registerCommand('FabricStudio.OneLake.resetCache', (item: FabricWorkspace) => item.refreshCache());

	vscode.commands.registerCommand('FabricStudio.WorkspaceRoleAssignment.update', (roleAssignment: FabricWorkspaceRoleAssignment = undefined) => roleAssignment.update());

	vscode.commands.registerCommand('FabricStudio.Item.openInFabric', (treeItem: FabricApiTreeItem) => treeItem.openInBrowser());
	vscode.commands.registerCommand('FabricStudio.Item.copyIdToClipboard', (treeItem: FabricApiTreeItem) => treeItem.copyIdToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyNameToClipboard', (treeItem: FabricApiTreeItem) => treeItem.copyNameToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPathToClipboard', (treeItem: FabricApiTreeItem) => treeItem.copyPathToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPropertiesToClipboard', (treeItem: FabricApiTreeItem) => treeItem.copyPropertiesToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.insertPath', (treeItem: FabricApiTreeItem) => treeItem.insertCode());
	vscode.commands.registerCommand('FabricStudio.Item.editDefinition', (treeItem: FabricWorkspaceTreeItem) => treeItem.editDefinition());
	vscode.commands.registerCommand('FabricStudio.Item.editTMDL', (treeItem: FabricWorkspaceTreeItem) => treeItem.editDefinition());
	vscode.commands.registerCommand('FabricStudio.Item.editPBIR', (treeItem: FabricWorkspaceTreeItem) => treeItem.editDefinition());
	vscode.commands.registerCommand('FabricStudio.Item.showDefintion', async (treeItem: FabricWorkspaceGenericViewer) => treeItem.showDefinition());
	vscode.commands.registerCommand('FabricStudio.Item.delete', async (treeItem: FabricApiTreeItem) => FabricApiTreeItem.delete("yesNo", treeItem));
	vscode.commands.registerCommand('FabricStudio.Item.publishToFabric', async (treeItem: FabricApiTreeItem) => FabricFSCache.publishToFabric(treeItem.resourceUri, false));
	vscode.commands.registerCommand('FabricStudio.Item.reloadFromFabric', async (treeItem: FabricApiTreeItem) => FabricFSCache.reloadFromFabric(treeItem.resourceUri, false));

	vscode.commands.registerCommand('FabricStudio.PowerBI.downloadPBIP', async (treeItem: FabricReport | FabricSemanticModel) => treeItem.downloadPBIP());


	vscode.commands.registerCommand('FabricStudio.SQL.copySQLConnectionString', (treeItem: FabricSQLItem) => treeItem.copySQLConnectionString());
	vscode.commands.registerCommand('FabricStudio.SQL.copySQLEndpoint', (treeItem: FabricSQLItem) => treeItem.copySQLEndpoint());
	vscode.commands.registerCommand('FabricStudio.SQL.openInMSSQLExtension', (treeItem: FabricSQLItem) => treeItem.openInMSSQLExtension());
	vscode.commands.registerCommand('FabricStudio.OneLake.browseInOneLake', (treeItem: FabricSQLItem) => treeItem.browseInOneLake());
	vscode.commands.registerCommand('FabricStudio.OneLake.copyOneLakeFilesPath', (treeItem: FabricSQLItem) => treeItem.copyOneLakeFilesPath());
	vscode.commands.registerCommand('FabricStudio.OneLake.copyOneLakeTablesPath', (treeItem: FabricSQLItem) => treeItem.copyOneLakeTablesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.Table.maintain', (lakehouseTable: FabricLakehouseTable) => lakehouseTable.runMaintainanceJob());

	vscode.commands.registerCommand('FabricStudio.SQLEndpoint.syncMetadata', (sqlEndpoint: FabricSqlEndpoint) => FabricSqlEndpoint.syncMetadata(sqlEndpoint));

	vscode.commands.registerCommand('FabricStudio.Warehouse.createSnapshot', (warehouse: FabricWarehouse) => warehouse.createSnapshot());
	vscode.commands.registerCommand('FabricStudio.Warehouse.createRestorePoint', (warehouse: FabricWarehouse) => warehouse.createRestorePoint());
	vscode.commands.registerCommand('FabricStudio.Warehouse.restore', (restorePoint: FabricWarehouseRestorePoint) => restorePoint.restore());


	vscode.commands.registerCommand('FabricStudio.MirroredDatabase.updateMirroringStatus', (syncrhonization: FabricMirroredDatabaseSynchronization) => syncrhonization.updateMirroringStatus());
	vscode.commands.registerCommand('FabricStudio.MirroredDatabase.startMirroring', (syncrhonization: FabricMirroredDatabaseSynchronization) => syncrhonization.startMirroring());
	vscode.commands.registerCommand('FabricStudio.MirroredDatabase.stopMirroring', (syncrhonization: FabricMirroredDatabaseSynchronization) => syncrhonization.stopMirroring());

	vscode.commands.registerCommand('FabricStudio.SqlDatabase.startMirroring', (mirroring: FabricSqlDatabaseMirroring) => mirroring.startMirroring());
	vscode.commands.registerCommand('FabricStudio.SqlDatabase.stopMirroring', (mirroring: FabricSqlDatabaseMirroring) => mirroring.stopMirroring());


	vscode.commands.registerCommand('FabricStudio.GrapqhQLApi.copyEndpoint', (graphQlApi: FabricGraphQLApi) => graphQlApi.copyGraphQLEndpoint());

	vscode.commands.registerCommand('FabricStudio.Notebook.run', (notebook: FabricItem) => FabricNotebook.runNotebook(notebook));

	vscode.commands.registerCommand('FabricStudio.SparkJob.run', (sparkJob: FabricItem) => FabricSparkJob.runSparkJob(sparkJob));

	vscode.commands.registerCommand('FabricStudio.DataPipeline.run', (dataPipeline: FabricDataPipeline) => dataPipeline.runPipeline());

	//#endregion

	//#region Uri Handler
	const uriHandler = new FabricUriHandler(context);
	//#endregion


	//#region Fabric Deployment Pipelines TreeView
	let fabricDeploymentPipelinesTreeProvider = new FabricPipelinesTreeProvider(context);

	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.refresh', (item: FabricPipelineTreeItem = undefined, showInfoMessage: boolean = true) => fabricDeploymentPipelinesTreeProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.deploySelection', (item: FabricPipelineTreeItem = undefined) => fabricDeploymentPipelinesTreeProvider.deploySelection(undefined));
	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.deployItem', (item: FabricPipelineTreeItem = undefined) => fabricDeploymentPipelinesTreeProvider.deploySelection(item));

	//#endregion

	//#region Fabric Connections TreeView
	let fabricConnectionsTreeViewProvider = new FabricConnectionsTreeProvider(context);

	vscode.commands.registerCommand('FabricStudio.Connections.refresh', (item: FabricConnectionTreeItem = undefined, showInfoMessage: boolean = true) => fabricConnectionsTreeViewProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Connections.filter', (item: FabricConnectionTreeItem = undefined) => fabricConnectionsTreeViewProvider.filter());
	//#endregion

	//#region Fabric Capacities TreeView
	let fabricCapacitiesTreeViewProvider = new FabricCapacitiesTreeProvider(context);

	vscode.commands.registerCommand('FabricStudio.Capacities.refresh', (item: FabricCapacityTreeItem = undefined, showInfoMessage: boolean = true) => fabricCapacitiesTreeViewProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Capacities.filter', (item: FabricCapacityTreeItem = undefined) => fabricCapacitiesTreeViewProvider.filter());
	//#endregion

	//#region Fabric Admin TreeView
	let fabricAdminTreeViewProvider = new FabricAdminTreeProvider(context);

	vscode.commands.registerCommand('FabricStudio.Admin.refresh', (item: FabricAdminTreeItem = undefined, showInfoMessage: boolean = true) => fabricAdminTreeViewProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Admin.filter', (item: FabricAdminTreeItem = undefined) => fabricAdminTreeViewProvider.filter());
	vscode.commands.registerCommand('FabricStudio.Admin.rename', (item: FabricAdminTreeItem = undefined) => item.rename());

	vscode.commands.registerCommand('FabricStudio.Admin.showDefintion', async (item: FabricAdminGenericViewer) => item.showDefinition());
	//#endregion

	//#region Fabric Git
	vscode.commands.registerCommand('FabricStudio.GIT.refresh', FabricGitRepositories.refresh);
	vscode.commands.registerCommand('FabricStudio.GIT.updateFromRepository', FabricGitRepositories.updateFromRepository);

	vscode.commands.registerCommand('FabricStudio.GIT.stageChanges', FabricGitRepositories.stageChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.unstageChanges', FabricGitRepositories.unstageChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.discardChanges', FabricGitRepositories.discardChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.commitStagedChanges', FabricGitRepositories.commitStagedChanges);

	//#endregion

	vscode.commands.registerCommand('FabricStudio.Api.CopyAccessToken', FabricApiService.copyAccessTokenToClipboard);


	// eventhandles when Fabric documents are saved
	vscode.workspace.onDidSaveTextDocument(FabricFSCache.onDidSave);
	vscode.workspace.onDidSaveNotebookDocument(FabricFSCache.onDidSave);

	vscode.workspace.onDidOpenNotebookDocument(FabricAPICompletionProvider.onDidOpenNotebookDocument);
}


export function deactivate() {
	ThisExtension.cleanUp();
}