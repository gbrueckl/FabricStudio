import * as vscode from 'vscode';

export class FabricUriHandler implements vscode.UriHandler {

	constructor(context: vscode.ExtensionContext) {
		const handlerRegistration = vscode.window.registerUriHandler(this);

		context.subscriptions.push(handlerRegistration);
	}

	public async handleUri(uri: vscode.Uri) {
		const params = new URLSearchParams(uri.fragment);
		const workspace = params.get("workspace");

		vscode.window.showInformationMessage("Workspace: " + workspace);
	}
}