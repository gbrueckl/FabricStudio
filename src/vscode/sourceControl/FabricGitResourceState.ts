import * as vscode from 'vscode';
import { iFabricApiGitItemChange, iFabricApiGitItemChangeType, iFabricApiGitItemIdentifier } from '../../fabric/_types';

export class FabricGitResourceState implements vscode.SourceControlResourceState {
	private _itemChange: iFabricApiGitItemChange;

	private _resourceUri: vscode.Uri;

	constructor(rootUri, item: iFabricApiGitItemChange) {
		this._itemChange = item;

		const absolutePath = vscode.Uri.joinPath(rootUri, item.itemMetadata.itemType, item.itemMetadata.displayName);
		this._resourceUri = absolutePath;
	}

	//#region SourceControlResourceState
	/**
	 * The {@link Uri} of the underlying resource inside the workspace.
	 */
	get resourceUri(): vscode.Uri {
		return this._resourceUri;
	}

	/**
	 * The {@link Command} which should be run when the resource
	 * state is open in the Source Control viewlet.
	 */
	get command(): vscode.Command {
		return undefined;
		// this doesnt yet work as the file would need to be loaded beforehand
		return { "title": "Open", "command": "vscode.open", "arguments": [this.resourceUri] }
	}

	/**
	 * The {@link SourceControlResourceDecorations decorations} for this source control
	 * resource state.
	 */
	get decorations(): vscode.SourceControlResourceDecorations {
		/* has to be implemented via FileDecorationProvider !?! */
		//return {faded: true, strikeThrough: true, tooltip: "Tooltip"};
		let fileDeco: vscode.FileDecoration;
		let change: iFabricApiGitItemChangeType;

		if (this._itemChange.conflictType == "Conflict") {
			fileDeco = new vscode.FileDecoration("C", "Conflict", new vscode.ThemeColor("gitDecoration.conflictResourceForeground"));
			fileDeco.propagate = true;
			return fileDeco;
		}
		else if (this._itemChange.workspaceChange) {
			change = this._itemChange.workspaceChange;
		}
		else if (this._itemChange.remoteChange) {
			change = this._itemChange.remoteChange;
		}

		switch (change) {
			case "Added":
				fileDeco = new vscode.FileDecoration("A", "Added", new vscode.ThemeColor("gitDecoration.addedResourceForeground"));
				break;
			case "Modified":
				//fileDeco = new vscode.FileDecoration("M", "Modified", new vscode.ThemeColor("gitDecoration.modifiedResourceForeground"));
				break;
			case "Deleted":
				return {faded: true, strikeThrough: true};
				break;
			default:
				vscode.window.showErrorMessage(`Unknown publish action: '${change}'`);
				return undefined;
		}

		return undefined;
	}

	/**
	 * Context value of the resource state. This can be used to contribute resource specific actions.
	 * For example, if a resource is given a context value as `diffable`. When contributing actions to `scm/resourceState/context`
	 * using `menus` extension point, you can specify context value for key `scmResourceState` in `when` expressions, like `scmResourceState == diffable`.
	 * ```json
	 * "contributes": {
	 *   "menus": {
	 *     "scm/resourceState/context": [
	 *       {
	 *         "command": "extension.diff",
	 *         "when": "scmResourceState == diffable"
	 *       }
	 *     ]
	 *   }
	 * }
	 * ```
	 * This will show action `extension.diff` only for resources with `contextValue` is `diffable`.
	 */
	get contextValue(): string {
		return undefined;
	}
	//#endregion


	get apiIdentifer(): iFabricApiGitItemIdentifier {
		return this._itemChange.itemMetadata.itemIdentifier;
	}

	get isConflict(): boolean {
		return this._itemChange.conflictType != "None";
	}
}