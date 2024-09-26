'use strict';

import * as vscode from 'vscode';
import { ThisExtension } from './ThisExtension';
import { FabricNotebookSerializer } from './vscode/notebook/FabricNotebookSerializer';
import { FabricNotebookType } from './vscode/notebook/FabricNotebook';
import { FabricApiTreeItem } from './vscode/treeviews/FabricApiTreeItem';
import { FabricCommandBuilder } from './vscode/input/FabricCommandBuilder';
import { FabricWorkspacesTreeProvider } from './vscode/treeviews/Workspaces/FabricWorkspacesTreeProvider';
import { FabricWorkspaceTreeItem } from './vscode/treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FabricLakehouse } from './vscode/treeviews/Workspaces/FabricLakehouse';
import { Helper } from '@utils/Helper';
import { FabricLakehouseTable } from './vscode/treeviews/Workspaces/FabricLakehouseTable';
import { FabricFileSystemProvider } from './vscode/filesystemProvider/FabricFileSystemProvider';
import { FabricFSFileDecorationProvider } from './vscode/fileDecoration/FabricFileDecorationProvider';
import { FabricFSUri } from './vscode/filesystemProvider/FabricFSUri';
import { FabricFSCache } from './vscode/filesystemProvider/FabricFSCache';
import { FabricGitRepositories } from './vscode/sourceControl/FabricGitRepositories';
import { FabricWorkspace } from './vscode/treeviews/Workspaces/FabricWorkspace';
import { FabricAPICompletionProvider } from './vscode/language/FabricAPICompletionProvider';
import { FabricNotebookContext } from './vscode/notebook/FabricNotebookContext';
import { FabricPipelinesTreeProvider } from './vscode/treeviews/Pipelines/FabricPipelinesTreeProvider';
import { FabricPipelineTreeItem } from './vscode/treeviews/Pipelines/FabricPipelineTreeItem';
import { TempFileSystemProvider } from './vscode/filesystemProvider/temp/TempFileSystemProvider';
import { FabricWorkspaceGenericViewer } from './vscode/treeviews/Workspaces/FabricWorkspaceGenericViewer';
import { FabricGraphQLApi } from './vscode/treeviews/Workspaces/FabricGraphQLApi';
import { FabricNotebook } from './vscode/treeviews/Workspaces/FabricNotebook';
import { FabricItem } from './vscode/treeviews/Workspaces/FabricItem';
import { FabricDataPipeline } from './vscode/treeviews/Workspaces/FabricDataPipeline';
import { FabricSparkJob } from './vscode/treeviews/Workspaces/FabricSparkJob';

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
	//Core.StatusBarLeft.show();
	//Core.StatusBarLeft.command = "FabricStudio.initialize";

	vscode.commands.registerCommand('FabricStudio.initialize', async () => {
		let isValidated: boolean = await ThisExtension.initialize(context)
		if (!isValidated) {
			ThisExtension.Logger.logInfo(`Error initializing ${context.extension.packageJSON.displayName}  - Please update your settings and restart VSCode!`);
			vscode.window.showErrorMessage(`Error initializing ${context.extension.packageJSON.displayName}  - Please update your settings and restart VSCode!`);
		}
		return isValidated;
	}
	);

	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			FabricNotebookType, new FabricNotebookSerializer(), { transientOutputs: true }
		)
	);

	//#region Fabric FileSystemProvider
	FabricFileSystemProvider.register(context);
	FabricFSFileDecorationProvider.register(context);

	TempFileSystemProvider.register(context);


	vscode.workspace.onDidOpenNotebookDocument((e) => {
		const metadata = FabricNotebookContext.get(e.metadata.guid.toString());

		metadata.uri = e.uri;

		FabricNotebookContext.set(e.metadata.guid, metadata);
	});

	const completionProvider = new FabricAPICompletionProvider(context);
	completionProvider.loadSwaggerFile();

	vscode.commands.registerCommand('FabricStudio.FS.publishToFabric', (uri) => FabricFSCache.publishToFabric(uri));
	vscode.commands.registerCommand('FabricStudio.FS.reloadFromFabric', (uri) => FabricFSCache.reloadFromFabric(uri));
	vscode.commands.registerCommand('FabricStudio.FS.openInFabric', (uri) => FabricFSUri.openInBrowser(uri));
	//#endregion

	//#region Fabric Workspaces TreeView
	vscode.commands.registerCommand('FabricStudio.updateQuickPickList', (treeItem: FabricApiTreeItem) => FabricCommandBuilder.pushQuickPickItem(treeItem));
	vscode.commands.registerCommand('FabricStudio.Item.openNewNotebook', (treeItem: FabricApiTreeItem) => FabricNotebookSerializer.openNewNotebook(treeItem));

	let fabricWorkspacesTreeProvider = new FabricWorkspacesTreeProvider(context);
	vscode.commands.registerCommand('FabricStudio.Workspaces.refresh', (item: FabricWorkspaceTreeItem = undefined, showInfoMessage: boolean = true) => fabricWorkspacesTreeProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Workspaces.editItems', (item: FabricWorkspaceTreeItem = undefined) => item.editItems());

	vscode.commands.registerCommand('FabricStudio.Workspace.manageSourceControl', (item: FabricWorkspace = undefined) => item.manageSourceControl());


	vscode.commands.registerCommand('FabricStudio.Item.openInFabric', (treeItem: FabricWorkspaceTreeItem) => treeItem.openInBrowser());
	vscode.commands.registerCommand('FabricStudio.Item.copyIdToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyIdToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyNameToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyNameToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPathToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyPathToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPropertiesToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyPropertiesToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.insertPath', (treeItem: FabricWorkspaceTreeItem) => treeItem.insertCode());
	vscode.commands.registerCommand('FabricStudio.Item.browseInOneLake', (treeItem: FabricWorkspaceTreeItem) => ThisExtension.browseInOneLake(treeItem));
	vscode.commands.registerCommand('FabricStudio.Item.editDefinition', (treeItem: FabricWorkspaceTreeItem) => treeItem.editDefinition());
	vscode.commands.registerCommand('FabricStudio.Item.showDefintion', async (treeItem: FabricWorkspaceGenericViewer) => treeItem.showDefinition());

	vscode.commands.registerCommand('FabricStudio.Lakehouse.copySQLConnectionString', (treeItem: FabricLakehouse) => treeItem.copySQLConnectionString());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copySQLEndpoint', (treeItem: FabricLakehouse) => treeItem.copySQLEndpoint());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeFilesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeFilesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeTablesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeTablesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.Table.maintain', (lakehouseTable: FabricLakehouseTable) => lakehouseTable.runMaintainanceJob());

	vscode.commands.registerCommand('FabricStudio.GrapqhQLApi.copyEndpoint', (graphQlApi: FabricGraphQLApi) => graphQlApi.copyGraphQLEndpoint());
	
	vscode.commands.registerCommand('FabricStudio.Notebook.run', (notebook: FabricItem) => FabricNotebook.runNotebook(notebook));

	vscode.commands.registerCommand('FabricStudio.SparkJob.run', (sparkJob: FabricItem) => FabricSparkJob.runSparkJob(sparkJob));
	
	vscode.commands.registerCommand('FabricStudio.DataPipeline.run', (dataPipeline: FabricDataPipeline) => dataPipeline.runPipeline());
	
	//#endregion


	//#region Fabric Deployment Pipelines TreeView
	let fabricDeploymentPipelinesTreeProvider = new FabricPipelinesTreeProvider(context);

	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.refresh', (item: FabricPipelineTreeItem = undefined, showInfoMessage: boolean = true) => fabricDeploymentPipelinesTreeProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.deploySelection', (item: FabricPipelineTreeItem = undefined) => fabricDeploymentPipelinesTreeProvider.deploySelection(undefined));
	vscode.commands.registerCommand('FabricStudio.DeploymentPipelines.deployItem', (item: FabricPipelineTreeItem = undefined) => fabricDeploymentPipelinesTreeProvider.deploySelection(item));
	
	//#endregion

	//#region Fabric Git
	vscode.commands.registerCommand('FabricStudio.GIT.refresh', FabricGitRepositories.refresh);
	vscode.commands.registerCommand('FabricStudio.GIT.updateFromRepository', FabricGitRepositories.updateFromRepository);

	vscode.commands.registerCommand('FabricStudio.GIT.stageChanges', FabricGitRepositories.stageChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.unstageChanges', FabricGitRepositories.unstageChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.discardChanges', FabricGitRepositories.discardChanges);
	vscode.commands.registerCommand('FabricStudio.GIT.commitStagedChanges', FabricGitRepositories.commitStagedChanges);

	//#endregion



	vscode.commands.executeCommand('FabricStudio.initialize');
}


export function deactivate() {
	ThisExtension.cleanUp();
}