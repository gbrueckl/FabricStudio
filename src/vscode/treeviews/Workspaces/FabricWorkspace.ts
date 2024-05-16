import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricLakehouses } from './FabricLakehouses';
import { FabricApiItemType, FabricApiWorkspaceType, iFabricApiCapacity, iFabricApiWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricDataPipelines } from './FabricDataPipelines';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspace extends FabricWorkspaceTreeItem {
	constructor(
		definition: iFabricApiWorkspace
	) {
		super(definition.id, definition.displayName, "Workspace", undefined, definition, definition.description);

		this.contextValue = this._contextValue;
		this.tooltip = this.getToolTip(this.itemDefinition);

		this.iconPath = this.getIconPath();
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = ["BROWSEONELAKE"];

		if (this.capacityId) {
			actions.push("UNASSIGNCAPACITY");
		}
		else {
			actions.push("ASSIGNCAPACITY")
		}

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];

		children.push(new FabricDataPipelines(this));
		children.push(new FabricLakehouses(this));

		return children;
	}

	get oneLakeUri(): vscode.Uri {
	// onelake:/<WorkspaceName>/<ItemName>.<ItemType>
		const workspace = this.getParentByType<FabricWorkspace>("Workspace");
		
		return vscode.Uri.parse(`onelake://${workspace.itemName}`);
	}

	get apiUrlPart(): string {
		return "workspaces/" + this.itemId;
	}

	get capacityId(): string {
		return this.itemDefinition?.capacityId;
	}

	get workspaceType(): FabricApiWorkspaceType {
		return FabricApiWorkspaceType[this.itemDefinition.type];
	}

	get itemDefinition(): iFabricApiWorkspace {
		return this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWorkspace) {
		this._itemDefinition = value;
	}

	// Workspace-specific functions
	async getCapacity(): Promise<iFabricApiCapacity> {
		if (!this.capacityId) {
			return undefined;
		}

		return (await FabricApiService.get<iFabricApiCapacity>(`/v1/capacities/${this.capacityId}`)).success;
	}

	// static get MyWorkspace(): FabricWorkspace {
	// 	return new FabricWorkspace({
	// 		"id": "myorg",
	// 		"displayName": "My Workspace"
	// 	})
	// }

	// Workspace-specific functions
	public async browseFabric(): Promise<void> {
		const fabricUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}://${this.workspaceId}`))

		await Helper.addToWorkspace(fabricUri.uri, `Fabric - Workspace ${this.itemName}`, true);
	}
}