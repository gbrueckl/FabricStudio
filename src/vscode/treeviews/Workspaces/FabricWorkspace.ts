import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { Helper, UniqueId } from '@utils/Helper';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricLakehouses } from './FabricLakehouses';
import { FabricApiItemType, FabricApiWorkspaceType, iFabricApiCapacity, iFabricApiItem, iFabricApiWorkspace, iFabricApiWorkspaceFolder, iFabricApiWorkspaceRoleAssignment } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricDataPipelines } from './FabricDataPipelines';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricGitRepositories } from '../../sourceControl/FabricGitRepositories';
import { FabricEnvironments } from './FabricEnvironments';
import { FabricGraphQLApis } from './FabricGraphQLApis';
import { FabricItem } from './FabricItem';
import { FabricWorkspaceRoleAssignments } from './FabricWorkspaceRoleAssignments';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';
import { FabricNotebooks } from './FabricNotebooks';
import { FabricMirroredDatabases } from './FabricMirroredDatabases';
import { FabricMapper } from '../../../fabric/FabricMapper';
import { FabricSqlEndpoints } from './FabricSqlEndpoints';
import { FabricWorkspaceManagedPrivateEndpoints } from './FabricWorkspaceManagedPrivateEndpoints';
import { FabricWorkspaceFolder } from './FabricWorkspaceFolder';
import { FabricConfiguration } from '../../configuration/FabricConfiguration';
import { FabricWorkspacesTreeProvider } from './FabricWorkspacesTreeProvider';
import { FabricReports } from './FabricReports';
import { FabricSemanticModels } from './FabricSemanticModels';
import { FabricQuickPickItem } from '../../input/FabricQuickPickItem';
import { FabricWarehouses } from './FabricWarehouses';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWorkspace extends FabricWorkspaceTreeItem {
	private _workspaceFolders: iFabricApiWorkspaceFolder[] = [];

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
			//"BROWSE_IN_ONELAKE", // disabled for now as OneLake API does not work well with blanks in workspace names
			"EDIT_DEFINITION",
			"RESET_CACHE",
			"CREATE_FOLDER",
		];

		if (this.capacityId) {
			actions.push("UNASSIGNCAPACITY");
		}
		else {
			actions.push("ASSIGNCAPACITY")
		}

		return orig + actions.join(",") + ",";
	}

	public get canDelete(): boolean {
		return false;
	}

	public get canRename(): boolean {
		return true;
	}

	protected getIconPath(): string | vscode.Uri {
		if(this.workspaceType == FabricApiWorkspaceType.Personal) {
			return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'myworkspace.svg');
		}
		return vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'icons', 'custom', 'workspace.svg');
	}

	get asQuickPickItem(): FabricQuickPickItem {
		let qpItem = super.asQuickPickItem; 
		if(this.itemDefinition?.capacityId) {
			qpItem.detail = `\tCapacityID: ${this.itemDefinition.capacityId}`;
		}

		return qpItem;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		let children: FabricWorkspaceTreeItem[] = [];
		let treeItem: FabricWorkspaceFolder | FabricWorkspaceGenericFolder;
		let itemGroupings: Map<FabricApiItemType | UniqueId, FabricWorkspaceFolder | FabricWorkspaceGenericFolder> = new Map<FabricApiItemType | UniqueId, FabricWorkspaceFolder | FabricWorkspaceGenericFolder>();
		let grouping: FabricApiItemType | UniqueId;

		const NO_FOLDER = "ZZZ___NO_FOLDER___";

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			try {
				const items = await FabricApiService.getList<iFabricApiItem>(this.apiPath + "items");

				if (items.error) {
					ThisExtension.Logger.logError(items.error.message);
					return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(items.error)];
				}

				let itemToAdd: FabricItem;

				if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
					await this.refreshWorkspaceFolders();

					for (let folder of this._workspaceFolders) {
						if (!folder.parentFolderId) {
							treeItem = new FabricWorkspaceFolder(folder.id, folder.displayName, folder, this);
							itemGroupings.set(folder.id, treeItem);
						}
					}

					treeItem = new FabricWorkspaceGenericFolder(NO_FOLDER, NO_FOLDER, "WorkspaceFolder", this, "");
					itemGroupings.set(NO_FOLDER, treeItem);
				}

				for (let item of items.success) {
					if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
						if (item.folderId) {
							const folder = this._workspaceFolders.find(f => f.id == item.folderId);
							if (folder.parentFolderId) {
								continue; // we only want root-level folders
							}
							grouping = item.folderId;
						}
						else {
							grouping = NO_FOLDER;
						}
					}
					else {
						grouping = item.type;
					}

					if (!itemGroupings.has(grouping)) {
						if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
							// should never happen!?!
						}
						else if (grouping == "Lakehouse") {
							treeItem = new FabricLakehouses(this);
						}
						else if (grouping == "Warehouse") {
							treeItem = new FabricWarehouses(this);
						}
						else if (grouping == "SQLEndpoint") {
							treeItem = new FabricSqlEndpoints(this);
						}
						else if (grouping == "DataPipeline") {
							treeItem = new FabricDataPipelines(this);
						}
						else if (grouping == "Environment") {
							treeItem = new FabricEnvironments(this);
						}
						else if (grouping == "GraphQLApi") {
							treeItem = new FabricGraphQLApis(this);
						}
						else if (grouping == "Notebook") {
							treeItem = new FabricNotebooks(this);
						}
						else if (grouping == "MirroredDatabase") {
							treeItem = new FabricMirroredDatabases(this);
						}
						else if (grouping == "Report") {
							treeItem = new FabricReports(this);
						}
						else if (grouping == "SemanticModel") {
							treeItem = new FabricSemanticModels(this);
						}
						else {
							const plural = FabricMapper.getItemTypePlural(grouping);
							treeItem = new FabricWorkspaceGenericFolder(
								this.itemId + "/" + plural,
								plural,
								plural as FabricApiItemType,
								this
							);
						}

						itemGroupings.set(grouping, treeItem);
					}

					itemToAdd = FabricWorkspacesTreeProvider.getFromApiDefinition(item, this);

					if (grouping == NO_FOLDER) {
						// set the parent to the workspace (=this)
						itemGroupings.get(grouping).addChild(itemToAdd, this);
					}
					else {
						itemGroupings.get(grouping).addChild(itemToAdd);
					}
				}

				children = Array.from(itemGroupings.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));

				if (FabricConfiguration.workspaceViewGrouping == "by Folder") {
					if (items.success.length == 0) {
						if (this._workspaceFolders.length == 0) {
							children = [FabricItem.NO_ITEMS];
						}
						else {
							children.pop();
						}
					}
					else {
						// remove the No Folder placeholder and place the children in the workspace directly
						var noFolder: FabricWorkspaceGenericFolder = children.pop() as FabricWorkspaceGenericFolder;
						if (noFolder.hasChildrenAdded) {
							const noFolderItems = await noFolder.getChildren();
							children.push(...noFolderItems);
						}
					}
				}


				let roleAssignments: FabricWorkspaceRoleAssignments = new FabricWorkspaceRoleAssignments(this);
				children.push(roleAssignments);

				let managedPrivateEndpoints: FabricWorkspaceManagedPrivateEndpoints = new FabricWorkspaceManagedPrivateEndpoints(this);
				children.push(managedPrivateEndpoints);

				children.push(new FabricWorkspaceGenericViewer("Spark Settings", this, "spark/settings"))
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

		return vscode.Uri.parse(`onelake://${workspace.itemId}`);
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

	async refreshCache(): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/onelake-shortcuts/reset-shortcut-cache?tabs=HTTP

		const endpoint = Helper.joinPath(this.apiPath, "onelake/resetShortcutCache");

		const response = await FabricApiService.awaitWithProgress("Resetting Shortcut Cache", FabricApiService.post(endpoint, undefined), 5000);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
	}

	async refreshWorkspaceFolders(): Promise<void> {
		const folders = await FabricApiService.getList<iFabricApiWorkspaceFolder>(this.apiPath + "folders");

		this._workspaceFolders = [];
		for (let folder of folders.success) {
			this._workspaceFolders.push(folder);
		}
	}

	get workspaceFolders(): iFabricApiWorkspaceFolder[] {
		return this._workspaceFolders;
	}
}