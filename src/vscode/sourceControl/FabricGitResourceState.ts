import * as vscode from 'vscode';
import { iFabricApiGitItemChange } from '../../fabric/_types';

export class FabricGitResourceState implements vscode.SourceControlResourceState {
	private _uri: vscode.Uri;
	private _command: vscode.Command;
	private _decorations: vscode.SourceControlResourceDecorations;
	private _contextValue: string;

	constructor(rootUri, item: iFabricApiGitItemChange) {
		const absolutePath = vscode.Uri.joinPath(rootUri, item.itemMetadata.itemType, item.itemMetadata.displayName);
		this._uri = absolutePath;
	}
	/**
	 * The {@link Uri} of the underlying resource inside the workspace.
	 */
	readonly resourceUri = this._uri;

	/**
	 * The {@link Command} which should be run when the resource
	 * state is open in the Source Control viewlet.
	 */
	readonly command?: Command;

	/**
	 * The {@link SourceControlResourceDecorations decorations} for this source control
	 * resource state.
	 */
	readonly decorations?: SourceControlResourceDecorations;

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
	readonly contextValue?: string;
}