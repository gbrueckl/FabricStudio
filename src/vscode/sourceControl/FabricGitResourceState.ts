import * as vscode from 'vscode';
import { iFabricApiGitItemChange, iFabricApiGitItemIdentifier } from '../../fabric/_types';

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
		return { "title": "Open", "command": "vscode.open", "arguments": [this.resourceUri] }
	}

	/**
	 * The {@link SourceControlResourceDecorations decorations} for this source control
	 * resource state.
	 */
	get decorations(): vscode.SourceControlResourceDecorations {
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
}