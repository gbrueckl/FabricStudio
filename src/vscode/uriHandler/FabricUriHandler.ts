import { Helper } from '@utils/Helper';
import * as vscode from 'vscode';
import { FABRIC_SCHEME } from '../filesystemProvider/FabricFileSystemProvider';
import { ThisExtension } from '../../ThisExtension';

export class FabricUriHandler implements vscode.UriHandler {

	constructor(context: vscode.ExtensionContext) {
		const handlerRegistration = vscode.window.registerUriHandler(this);

		context.subscriptions.push(handlerRegistration);
	}

	public async handleUri(uri: vscode.Uri) {
		//https://vscode.dev/+GerhardBrueckl.fabricstudio/open?workspaceId=MyWorkspace
		ThisExtension.Logger.logInfo(`Uri-Handler invoked: ${uri.toString()}`);
		
		switch (uri.path) {
			case "/open":
				this.openFromUri(uri);
				break;
			default:
				vscode.window.showErrorMessage(`Unknown command: ${uri.path}`);
				break;
		}
	}

	public openFromUri(uri: vscode.Uri): void {
		const params = new URLSearchParams(uri.query);
		const workspaceId = params.get("workspaceId");

		if (workspaceId) {
			Helper.addToWorkspace(vscode.Uri.parse(`${FABRIC_SCHEME}:/workspaces/${workspaceId}`), `Fabric Workspace`, true, true);
		}
		else {
			vscode.window.showErrorMessage("No workspaceId provided!");
			return;
		}
	}
}