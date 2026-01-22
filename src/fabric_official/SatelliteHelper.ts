import { IArtifact } from "@microsoft/vscode-fabric-api";
import { ThisExtension } from "../ThisExtension";
import { FabricWorkspaceTreeItem } from "../vscode/treeviews/Workspaces/FabricWorkspaceTreeItem";
import { iFabricApiWorkspace } from "../fabric/_types";
import { FabricWorkspace } from "../vscode/treeviews/Workspaces/FabricWorkspace";
import { FabricMapper } from "../fabric/FabricMapper";

export class SatelliteHelper {
	// Placeholder for potential satellite helper methods

	static async getWorkspaceTreeItemFromArtifact(artifact: IArtifact): Promise<FabricWorkspace> {
		const res = await ThisExtension.apiClient.sendRequest({
			method: 'GET',
			pathTemplate: `/v1/workspaces/${artifact.workspaceId}`,
		});
		if (res?.status !== 200) {
			throw new Error(`Error Getting Workspace ${res?.status}  ${res?.bodyAsText}`);
		}

		let workspaceDef = res?.parsedBody as iFabricApiWorkspace;

		let workspace = new FabricWorkspace(workspaceDef);

		return workspace;
	}

	static async getArtifactDefinition<T>(artifact: IArtifact): Promise<T> {
		const itemTypePlural = FabricMapper.getItemTypePlural(artifact.type);
		const res = await ThisExtension.apiClient.sendRequest({
			method: 'GET',
			pathTemplate: `/v1/workspaces/${artifact.workspaceId}/${itemTypePlural}/${artifact.id}`,
		});
		if (res?.status !== 200) {
			throw new Error(`Error Getting definiition of ${artifact.type} '${artifact.displayName}': ${res?.status}  ${res?.bodyAsText}`);
		}

		let definition = res?.parsedBody as T;
		
		return definition;
	}
}