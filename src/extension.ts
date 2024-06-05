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
import { FabricGitRepository } from './vscode/sourceControl/FabricGitRepository';
import { FabricGitRepositories } from './vscode/sourceControl/FabricGitRepositories';

export async function activate(context: vscode.ExtensionContext) {

	await ThisExtension.initializeLogger(context);

	const prevInstalledVersion = context.globalState.get<vscode.Extension<any>>(`${context.extension.id}.installedVersion`, undefined);
	if (!prevInstalledVersion || prevInstalledVersion.packageJSON.version !== context.extension.packageJSON.version) {
		context.globalState.update(`${context.extension.id}.installedVersion`, context.extension);
		const action = vscode.window.showInformationMessage(`${context.extension.packageJSON.itemName} updated to version ${context.extension.packageJSON.version}`, "Change Log");

		action.then((value) => {
			if (value == "Change Log") {
				vscode.env.openExternal(vscode.Uri.parse(`${context.extension.packageJSON.repository.url}/blob/main/CHANGELOG.md`));
			}
		});
	}

	FabricGitRepositories.initializeRepository("ac9b8e93-9557-4f59-ba6f-6e7c6c2b94bf");

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
			ThisExtension.Logger.logInfo("Issue initializing extension - Please update your settings and restart VSCode!");
			vscode.window.showErrorMessage("Issue initializing extension - Please update your settings and restart VSCode!");
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

	vscode.commands.registerCommand('FabricStudio.Item.copyIdToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyIdToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyNameToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyNameToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPathToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyPathToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.insertPath', (treeItem: FabricWorkspaceTreeItem) => treeItem.insertCode());
	vscode.commands.registerCommand('FabricStudio.Item.browseInOneLake', (treeItem: FabricWorkspaceTreeItem) => Helper.addToWorkspace(treeItem.oneLakeUri, `OneLake - ${treeItem.label}`, true, true));
	vscode.commands.registerCommand('FabricStudio.Item.editDefinition', (treeItem: FabricWorkspaceTreeItem) => treeItem.editDefinition());


	vscode.commands.registerCommand('FabricStudio.Lakehouse.copySQLConnectionString', (treeItem: FabricLakehouse) => treeItem.copySQLConnectionString());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeFilesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeFilesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeTablesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeTablesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.Table.maintain', (lakehouseTable: FabricLakehouseTable) => lakehouseTable.runMaintainanceJob());
	//#endregion

	//#region Fabric Git
	vscode.commands.registerCommand('FabricStudio.GIT.refresh', async (repository: FabricGitRepository) =>
		repository.refresh()
	);

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