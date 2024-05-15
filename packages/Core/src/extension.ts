'use strict';

import * as vscode from 'vscode';
import { Core, REPO_PATH } from './Core';

export async function activate(context: vscode.ExtensionContext) {

	await Core.initializeLogger(context);

	const prevInstalledVersion = context.globalState.get<vscode.Extension<any>>(`${context.extension.id}.installedVersion`, undefined);
	if (!prevInstalledVersion || prevInstalledVersion.packageJSON.version !== context.extension.packageJSON.version) {
		context.globalState.update(`${context.extension.id}.installedVersion`, context.extension);
		const action = vscode.window.showInformationMessage(`${context.extension.packageJSON.displayName} updated to version ${context.extension.packageJSON.version}`, "Change Log");

		action.then((value) => {
			if (value == "Change Log") {
				vscode.env.openExternal(vscode.Uri.parse(`${context.extension.packageJSON.repository.url}/blob/main/${REPO_PATH}/CHANGELOG.md`));
			}
		});
	}

	// some of the following code needs the context before the initialization already
	Core.extensionContext = context;

	Core.StatusBarRight = vscode.window.createStatusBarItem("fabric.core-right", vscode.StatusBarAlignment.Right);
	// Core.StatusBarRight.show();
	// Core.setStatusBarRight("Initialized!");

	Core.StatusBarLeft = vscode.window.createStatusBarItem("fabric.core-left", vscode.StatusBarAlignment.Left);
	//Core.StatusBarLeft.show();
	//Core.StatusBarLeft.command = "FabricStudio.core.initialize";

	vscode.commands.registerCommand('FabricStudio.core.initialize', async () => {
		let isValidated: boolean = await Core.initialize(context)
		if (!isValidated) {
			Core.Logger.logInfo("Issue initializing extension - Please update your settings and restart VSCode!");
			vscode.window.showErrorMessage("Issue initializing extension - Please update your settings and restart VSCode!");
		}
		return isValidated;
	}
	);

	vscode.commands.executeCommand('FabricStudio.core.initialize');
}


export function deactivate() {
	Core.cleanUp();
}