import * as vscode from 'vscode';

import { ArtifactTreeNode, FabricTreeNode, IArtifact } from "@microsoft/vscode-fabric-api";
import { ThisExtension } from '../../../../ThisExtension';


export class FabricItemArtifactTreeNodeMixin extends ArtifactTreeNode {
    public readonly artifactType = 'Lakehouse';

    constructor(public readonly artifact: IArtifact) {
        super(ThisExtension.extensionContext, artifact);
    }

    /**
     * Satellite extensions should override this method to create child nodes for the artifact
     * @returns The {@link FabricTreeNode}s to display below this tree node
     */
    // async getChildNodes(): Promise<FabricTreeNode[]> {
    //     let tablesNode = new ArtifactTreeNode(this.context, this.artifact);
    //     tablesNode.label = 'Tables';
    //     tablesNode.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    //     tablesNode.tooltip = `Tables in Lakehouse: ${this.artifact.displayName}`;
    //     tablesNode.id = this.artifact.id + '_tables';
    //     return [
    //         tablesNode,
    //     ];
    // }
}