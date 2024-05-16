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

	vscode.commands.registerCommand('FabricStudio.updateQuickPickList', (treeItem: FabricApiTreeItem) => FabricCommandBuilder.pushQuickPickItem(treeItem));
	vscode.commands.registerCommand('FabricStudio.Item.openNewNotebook', (treeItem: FabricApiTreeItem) => FabricNotebookSerializer.openNewNotebook(treeItem));

	let fabricWorkspacesTreeProvider = new FabricWorkspacesTreeProvider(context);
	vscode.commands.registerCommand('FabricStudio.Workspaces.refresh', (item: FabricWorkspaceTreeItem = undefined, showInfoMessage: boolean = true) => fabricWorkspacesTreeProvider.refresh(item, showInfoMessage));
	vscode.commands.registerCommand('FabricStudio.Workspaces.editItems', (item: FabricWorkspaceTreeItem = undefined) => item.editDefinitions());

	vscode.commands.registerCommand('FabricStudio.Item.copyIdToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyIdToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyNameToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyNameToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.copyPathToClipboard', (treeItem: FabricWorkspaceTreeItem) => treeItem.copyPathToClipboard());
	vscode.commands.registerCommand('FabricStudio.Item.insertPath', (treeItem: FabricWorkspaceTreeItem) => treeItem.insertCode());
	vscode.commands.registerCommand('FabricStudio.Item.browseInOneLake', (treeItem: FabricWorkspaceTreeItem) => Helper.addToWorkspace(treeItem.oneLakeUri, `OneLake - ${treeItem.label}`, true, true));


	vscode.commands.registerCommand('FabricStudio.Lakehouse.copySQLConnectionString', (treeItem: FabricLakehouse) => treeItem.copySQLConnectionString());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeFilesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeFilesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.copyOneLakeTablesPath', (treeItem: FabricLakehouse) => treeItem.copyOneLakeTablesPath());
	vscode.commands.registerCommand('FabricStudio.Lakehouse.Table.maintain', (lakehouseTable: FabricLakehouseTable) => lakehouseTable.runMaintainanceJob());


	vscode.commands.executeCommand('FabricStudio.initialize');
}


export function deactivate() {
	ThisExtension.cleanUp();
}