import * as vscode from 'vscode';
import { FABRIC_SCHEME } from '../filesystemProvider/FabricFileSystemProvider';
import { FabricFSUri, FabricUriType } from '../filesystemProvider/FabricFSUri';
import { FabricFSCache } from '../filesystemProvider/FabricFSCache';
import { FabricFSPublishAction } from '../filesystemProvider/_types';
import { ThisExtension } from '../../ThisExtension';
import { FabricWorkspaceTreeItem } from '../treeviews/Workspaces/FabricWorkspaceTreeItem';


export class FabricFSFileDecorationProvider implements vscode.FileDecorationProvider {
	private static provider: FabricFSFileDecorationProvider;
	// maintain a mapping of URIs to workspace tree items to be able to trigger a refresh on the tree item when the file decoration changes for better performance (instead of refreshing the whole tree)
	private static uriToWorkspaceItemMap: Map<string, FabricWorkspaceTreeItem> = new Map<string, FabricWorkspaceTreeItem>();

	protected _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri[]>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	public static async register(context: vscode.ExtensionContext) {
		const fdp = new FabricFSFileDecorationProvider()
		context.subscriptions.push(vscode.window.registerFileDecorationProvider(fdp));

		FabricFSFileDecorationProvider.provider = fdp;
	}

	public static addUriToWorkspaceItemMapping(uri: vscode.Uri, item: FabricWorkspaceTreeItem) {
		// when an URI is changed, refresh the associated parent (=item)
		FabricFSFileDecorationProvider.uriToWorkspaceItemMap.set(uri.toString(), item.parent);
	}

	public static updateFileDecoration(urisToUpdate: vscode.Uri[]) {
		this.provider._onDidChangeFileDecorations.fire(urisToUpdate);
		let treeItem = this.uriToWorkspaceItemMap.get(urisToUpdate[0].toString());
		ThisExtension.TreeViewWorkspaces.refresh(treeItem, false, true);
	}

	public provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
		if (uri.scheme !== FABRIC_SCHEME) {
			return undefined;
		}

		const fabricUri: FabricFSUri = new FabricFSUri(uri);

		if (!fabricUri.isValid) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		if (fabricUri.uriType === FabricUriType.item) {
			const item = FabricFSCache.getLocalChanges(fabricUri);
			if (item != undefined) {
				let fileDeco: vscode.FileDecoration;
				switch (item) {
					case FabricFSPublishAction.CREATE:
						fileDeco = new vscode.FileDecoration("A", "Added", new vscode.ThemeColor("gitDecoration.addedResourceForeground"));
						break;
					case FabricFSPublishAction.MODIFIED:
						fileDeco = new vscode.FileDecoration("M", "Modified", new vscode.ThemeColor("gitDecoration.modifiedResourceForeground"));
						break;
					case FabricFSPublishAction.DELETE:
						fileDeco = new vscode.FileDecoration("D", "Deleted", new vscode.ThemeColor("gitDecoration.deletedResourceForeground"));
						break;
					default:
						vscode.window.showErrorMessage(`Unknown publish action: '${item}'`);
						return undefined;
				}
				fileDeco.propagate = true;
				return fileDeco
			}
		}
		return undefined;
	}
}
