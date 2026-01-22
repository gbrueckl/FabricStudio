import * as vscode from 'vscode';

import { ArtifactTreeNode, IArtifact, IFabricTreeNodeProvider } from '@microsoft/vscode-fabric-api';;
import { FabricLakehouse } from '../../vscode/treeviews/Workspaces/FabricLakehouse';
import { iFabricApiLakehouse } from '../../fabric/_types';
import { SatelliteHelper } from '../SatelliteHelper';
import { FabricWorkspaceGenericFolder } from '../../vscode/treeviews/Workspaces/FabricWorkspaceGenericFolder';
import { FabricLakehouses } from '../../vscode/treeviews/Workspaces/FabricLakehouses';

// Remote workspace tree customization
export class LakehouseTreeNodeProvider implements IFabricTreeNodeProvider {
    public readonly artifactType = 'Lakehouse';

    constructor(private ctx: vscode.ExtensionContext) { }

    async createArtifactTreeNode(artifact: IArtifact): Promise<FabricLakehouse> {
        // Return your specialized node (can override getChildNodes, commands, contextValue, etc.)
        const workspace = await SatelliteHelper.getWorkspaceTreeItemFromArtifact(artifact); // No parent available in this context
        const artifactTypeContainer = new FabricLakehouses(workspace);

        const artifactDefinition = await SatelliteHelper.getArtifactDefinition<iFabricApiLakehouse>(artifact);

        return new FabricLakehouse(artifactDefinition, artifactTypeContainer);
    }
}