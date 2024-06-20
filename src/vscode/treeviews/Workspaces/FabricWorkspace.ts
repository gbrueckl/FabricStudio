import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricLakehouses } from './FabricLakehouses';
import { FabricApiItemType, FabricApiWorkspaceType, iFabricApiCapacity, iFabricApiItem, iFabricApiWorkspace } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricDataPipelines } from './FabricDataPipelines';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';
import { FABRIC_SCHEME } from '../../filesystemProvider/FabricFileSystemProvider';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricLakehouse } from './FabricLakehouse';
import { FabricDataPipeline } from './FabricDataPipeline';
import { FabricGitRepositories } from '../../sourceControl/FabricGitRepositories';

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

		let actions: string[] = [
			"BROWSE_IN_ONELAKE",
			"EDIT_DEFINITION"
		];

		if (this.capacityId) {
			actions.push("UNASSIGNCAPACITY");
		}
		else {
			actions.push("ASSIGNCAPACITY")
		}

		return orig + actions.join(",") + ",";
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceGenericFolder[] = [];
		let treeItem: FabricWorkspaceGenericFolder;
		let itemTypes: Map<FabricApiItemType, FabricWorkspaceGenericFolder> = new Map<FabricApiItemType, FabricWorkspaceGenericFolder>();

		// children.push(new FabricDataPipelines(this));
		// children.push(new FabricLakehouses(this));

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath + "items");
				let itemToAdd: FabricWorkspaceTreeItem;
				for (let item of items.success) {
					if (!itemTypes.has(item.type)) {
						if (item.type == "Lakehouse") {
							treeItem = new FabricLakehouses(this);
						}
						else if (item.type == "DataPipeline") {
							treeItem = new FabricDataPipelines(this);
						}
						else {
							treeItem = new FabricWorkspaceGenericFolder(
								this.itemId + "/" + item.type + "s",
								item.type + "s",
								item.type + "s" as FabricApiItemType,
								this
							);
						}
						itemTypes.set(item.type, treeItem);
					}

					if (item.type == "Lakehouse") {
						itemToAdd = new FabricLakehouse(item, this);
					}
					else if (item.type == "DataPipeline") {
						itemToAdd = new FabricDataPipeline(item, this);
					}
					else {
						itemToAdd = new FabricWorkspaceTreeItem(item.id, item.displayName, item.type as FabricApiItemType, itemTypes.get(item.type), item, item.description, vscode.TreeItemCollapsibleState.None);
					}
					itemTypes.get(item.type).addChild(itemToAdd);
				}

				children = Array.from(itemTypes.values());
			}
			catch (e) {
				ThisExtension.Logger.logInfo("Could not load items for workspace " + this.workspace.itemName);
			}

			return children;
		}
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

	async manageSourceControl(): Promise<void> {
		await FabricGitRepositories.initializeRepository(this.workspaceId);
	}
}