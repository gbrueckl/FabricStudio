import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiItem } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGraphQLApi extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiItem,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.id, definition.displayName, "GraphQLApi", parent, definition, definition.description, vscode.TreeItemCollapsibleState.None);

		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [
			"COPY_GRAPHQLAPI_ENDPOINT",
		];

		return orig + actions.join(",") + ",";
	}

	public async copyGraphQLEndpoint(): Promise<void> {
		let endpoint = `${FabricApiService.ApiBaseUrl}/workspaces/${this.workspaceId}/graphqlapis/${this.itemId}/graphql`
		vscode.env.clipboard.writeText(endpoint);
	}
}