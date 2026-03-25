import * as vscode from 'vscode';

import { ThisExtension, TreeProviderId } from '../ThisExtension';

import { FabricApiTreeItem } from './treeviews/FabricApiTreeItem';
import { FabricWorkspace } from './treeviews/Workspaces/FabricWorkspace';
import { FabricWorkspaceTreeItem } from './treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FabricQuickPickItem } from './input/FabricQuickPickItem';
import { FabricWorkspaceRoleAssignment } from './treeviews/Workspaces/FabricWorkspaceRoleAssignment';
import { FabricGatewayRoleAssignment } from './treeviews/Connections/FabricGatewayRoleAssignment';
import { FabricConnectionRoleAssignment } from './treeviews/Connections/FabricConnectionRoleAssignment';
import { FabricCapacity } from './treeviews/Capacities/FabricCapacity';
import { FabricWorkspaceFolder } from './treeviews/Workspaces/FabricWorkspaceFolder';
import { FabricApiService } from '../fabric/FabricApiService';
import { FabricConnection } from './treeviews/Connections/FabricConnection';
import { FabricSemanticModel } from './treeviews/Workspaces/FabricSemanticModel';
import { FabricGateway } from './treeviews/Connections/FabricGateway';

export const FabricDragMIMEType = "fabricstudiodragdrop";

class FabricObjectTransferItem extends vscode.DataTransferItem {
	constructor(private _nodes: readonly FabricApiTreeItem[]) {
		super(_nodes);
	}

	asObject(): readonly FabricApiTreeItem[] {
		return this._nodes;
	}

	asFile(): vscode.DataTransferFile | undefined {
		if (this._nodes.length == 1) {
			const item = this._nodes[0] as FabricApiTreeItem;

			if(item.resourceUri) {
				return {
					name: item.resourceUri.path.split('/').pop() || "item.json",
					uri: item.resourceUri,
					data: async () => await vscode.workspace.fs.readFile(item.resourceUri)
				};
			}
		}
	}
}

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricDragAndDropController implements vscode.TreeDragAndDropController<FabricApiTreeItem> {
	// seems like adding the mimeTypes explicitly here does not work ?!?
	readonly dropMimeTypes: readonly string[] = [
		// FabricDragMIMEType,
		"text/uri-list"
	].concat(ThisExtension.TreeProviderIdsForDragAndDrop.map((x) => x.toString()));

	readonly dragMimeTypes: readonly string[] = [
		// FabricDragMIMEType
	]//.concat(ThisExtension.TreeProviderIdsForDragAndDrop.map((x) => x.toString()));

	public async handleDrag?(source: readonly FabricApiTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		// dataTransfer.set(source[0].TreeProvider, new FabricObjectTransferItem(source));
		const transferItem = new FabricObjectTransferItem(source);
		dataTransfer.set(FabricDragMIMEType, transferItem);
	}

	public async handleDrop?(target: FabricApiTreeItem, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		ThisExtension.Logger.logInfo("Dropped item(s) on " + target.itemType + " ...");

		// when a PBIX file is dropped on a Group/Workspace or its Datasets folder
		// let uriList = await dataTransfer.get("text/uri-list");
		// if (uriList != null) {
		// 	if (["XXX_GROUP", "XXX_DATASETS"].includes(target.itemType)) {
		// 		const uriListString = (await uriList.asString());
		// 		ThisExtension.Logger.logInfo("File(s) dropped on Fabric Group: " + uriListString.toString());
		// 		const fileUris = uriListString.split("\r\n").filter((x) => x.startsWith("file://") && x.endsWith(".pbix")).map((x) => vscode.Uri.parse(x.trim()));

		// 		const targetGroup: FabricWorkspace = target.getParentByType("Workspace") as FabricWorkspace;

		// 		const pbixImport = undefined //await FabricWorkspace.uploadPbixFiles(targetGroup, fileUris);
		// 		if (pbixImport) {
		// 			ThisExtension.Logger.logInfo("Imported PBIX: " + pbixImport[0].name + " (" + pbixImport[0].id + ")");
		// 			ThisExtension.refreshTreeView(target.TreeProvider, targetGroup);
		// 		}
		// 		else {
		// 			ThisExtension.Logger.logError("ERROR importing PBIX: " + JSON.stringify(pbixImport, null, 4), true);
		// 		}
		// 		return;
		// 	}
		// 	else {
		// 		ThisExtension.Logger.logWarning("File(s) dropped on Fabric Item but no drop-handler was defined for " + target.itemType);
		// 	}
		// }

		let transferItem = dataTransfer.get(FabricDragMIMEType);

		if (!transferItem) {
			ThisExtension.Logger.logWarning(`Item dropped on Fabric Workspace Tree-View - but MimeType '${FabricDragMIMEType}' was not found!`);
			return;
		}

		let sourceItems: FabricApiTreeItem[];
		ThisExtension.Logger.logDebug("TransferItem: \n" + JSON.stringify(transferItem.value, null, 4));
		if (typeof transferItem.value === 'string' || transferItem.value instanceof String) {
			try {
				let x = transferItem.value as string
				let y = JSON.parse(x)
				sourceItems = y as FabricApiTreeItem[];
			}
			catch (e) {
				ThisExtension.Logger.logError("Error parsing dropped item: " + e);
			}
		}
		else {
			sourceItems = transferItem.value;
		}

		await this.handleFabricDrop(sourceItems, target);
	}

	public async handleFabricDrop(sourceItems: FabricApiTreeItem[], targetItem: FabricApiTreeItem): Promise<void> {
		const source_Item0: FabricApiTreeItem = sourceItems[0];
		const isTagItem = (item: FabricApiTreeItem): boolean => ["AdminTag", "ItemTag", "WorkspaceTag"].includes(item.itemType);
		const resolveAssignableTarget = (item: FabricApiTreeItem): FabricWorkspaceTreeItem => {
			if (item instanceof FabricWorkspace) {
				return item as FabricWorkspaceTreeItem;
			}

			if (item.itemType == "ItemTags" || item.itemType == "WorkspaceTags") {
				if (item.itemType == "WorkspaceTags") {
					return item.getParentByType<FabricWorkspace>("Workspace");
				}

				return item.parent as FabricWorkspaceTreeItem;
			}

			if (item.contextValue?.includes("FABRIC_ITEM")) {
				return item as FabricWorkspaceTreeItem;
			}

			return undefined;
		};
		const applyTagToTarget = async (tagIds: string[], targetItem: FabricWorkspaceTreeItem): Promise<boolean> => {
			if (tagIds.length == 0) {
				return false;
			}

			const body = { "tags": tagIds };
			const target = targetItem;
			if (target instanceof FabricWorkspace) {
				const response = await FabricApiService.post(`/v1/workspaces/${target.itemId}/applyTags`, body);
				if (response.error) {
					ThisExtension.Logger.logError(`Error applying tag(s) to Workspace '${target.itemName}': ${response.error.message}`, true);
					return false;
				}
			}
			else {
				const response = await FabricApiService.post(`/v1/workspaces/${target.workspaceId}/items/${target.itemId}/applyTags`, body);
				if (response.error) {
					ThisExtension.Logger.logError(`Error applying tag(s) to Item '${target.itemName}': ${response.error.message}`, true);
					return false;
				}
			}

			ThisExtension.TreeViewWorkspaces.refresh(target.refreshedBy as FabricWorkspaceTreeItem, false, true);
			return true;
		};

		let actions: Map<string, () => Promise<void>> = new Map<string, () => Promise<void>>();

		// by default we refresh the treeview of the target item
		let treeViewtoRefresh: TreeProviderId = targetItem.treeProvider;

		// AIDEV-NOTE: Tag drag/drop: one or more tags dropped onto a workspace or item applies all dragged tags.
		if (isTagItem(source_Item0)) {
			const sourceTags = sourceItems.filter(item => isTagItem(item));
			const sourceTagIds = Array.from(new Set(sourceTags.map(tag => tag.itemDefinition?.id).filter(x => !!x)));
			const target = resolveAssignableTarget(targetItem);

			if (target && sourceTagIds.length > 0) {
				const applyTag = async () => {
					await applyTagToTarget(sourceTagIds, target);
				};

				actions.set("Apply Tag", applyTag);
			}
		}
		else if (source_Item0.itemType == "WorkspaceRoleAssignment") {
			const sourceItem = source_Item0 as FabricWorkspaceRoleAssignment;
			if (["WorkspaceRoleAssignments", "Workspace"].includes(targetItem.itemType)) {
				let target = targetItem as FabricWorkspace;
				if (targetItem.itemType == "WorkspaceRoleAssignments") {
					// if the target is the WorkspaceRoleAssignments folder, we can add the role assignment to the parent Workspace
					target = targetItem.parent as FabricWorkspace;
				}

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewWorkspaces.refresh(target, false, true);
				}

				actions.set("Add WorkspaceRoleAssignment", addRoleAssignment);
			}
		}
		else if (source_Item0.itemType == "GatewayRoleAssignment") {
			const sourceItem = source_Item0 as FabricGatewayRoleAssignment;
			if (["GatewayRoleAssignments", "Gateway"].includes(targetItem.itemType)) {
				let target = targetItem as FabricGateway;
				if (targetItem.itemType == "GatewayRoleAssignments") {
					// if the target is the GatewayRoleAssignments folder, we can add the role assignment to the parent Gateway
					target = targetItem.parent as FabricGateway;
				}

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewConnections.refresh(target.refreshedBy, false);
				}

				actions.set("Add GatewayRoleAssignment", addRoleAssignment);
			}
		}
		else if (source_Item0.itemType == "ConnectionRoleAssignment") {
			const sourceItem = source_Item0 as FabricConnectionRoleAssignment;
			if (["ConnectionRoleAssignments", "Connection"].includes(targetItem.itemType)) {
				
				let target = targetItem as FabricConnection;
				if (targetItem.itemType == "ConnectionRoleAssignments") {
					// if the target is the ConnectionRoleAssignments folder, we can add the role assignment to the parent Connection
					target = targetItem.parent as FabricConnection;
				}

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewConnections.refresh(target, false);
				}

				actions.set("Add ConnectionRoleAssignment", addRoleAssignment);
			}
		}
		else if (source_Item0.itemType == "Workspace" || source_Item0.itemType == "CapacityWorkspace") {
			const sourceItem = source_Item0 as FabricWorkspace;
			if (["Capacity", "CapacityWorkspaces"].includes(targetItem.itemType)) {
				const target = targetItem as FabricCapacity;

				const assignToCapacity = async () => {
					for(const workspace of sourceItems) {
						if(workspace.itemType != "Workspace" && workspace.itemType != "CapacityWorkspace") {
							ThisExtension.Logger.logWarning(`Skipping item of type '${workspace.itemType}' - only items of type 'Workspace' or 'CapacityWorkspace' can be assigned to a Capacity!`, true);
							continue;
						}
						const sourceItem = workspace as FabricWorkspace;
						await FabricCapacity.assignWorkspace(sourceItem.itemDefinition, target.itemDefinition);
					}
					ThisExtension.TreeViewCapacities.refresh(target.parent, false);
					ThisExtension.TreeViewCapacities.refresh(sourceItem.parent, false);
				}
				treeViewtoRefresh = sourceItem.treeProvider
				actions.set("Assign to Capacity", assignToCapacity);
			}
		}
		else if (source_Item0.itemType == "WorkspaceFolder" && sourceItems.length == 1) {
			const sourceItem = source_Item0 as FabricWorkspaceFolder;
			if (["WorkspaceFolder"].includes(targetItem.itemType)) {
				const target = targetItem as FabricWorkspaceFolder;

				if (sourceItem.workspaceId != target.workspaceId) {
					const msg: string = "Moving folders between workspaces is not allowed!"
					ThisExtension.Logger.logWarning(msg, true);
					return;
				}

				const moveToFolder = async () => {
					await FabricWorkspaceFolder.moveToFolder(sourceItem.itemDefinition, target.itemDefinition);
					ThisExtension.TreeViewWorkspaces.refresh(target.parent, false, true);
				}
				treeViewtoRefresh = sourceItem.treeProvider;
				actions.set("Move to Folder", moveToFolder);
			}
			else if (["Workspace"].includes(targetItem.itemType)) {
				const target = targetItem as FabricWorkspace;

				if (sourceItem.workspaceId != target.workspaceId) {
					const msg: string = "Moving folders between workspaces is not allowed!"
					ThisExtension.Logger.logWarning(msg, true);
					return;
				}

				const moveToWorkspaceRoot = async () => {
					FabricWorkspaceFolder.moveToFolder(sourceItem.itemDefinition);
					ThisExtension.TreeViewWorkspaces.refresh(target.parent, false, true);
				}
				treeViewtoRefresh = target.treeProvider;
				actions.set("Move to Workspace Root", moveToWorkspaceRoot);

			}
		}
		// AIDEV-NOTE: bindConnection API: POST /v1/workspaces/{workspaceId}/semanticModels/{semanticModelId}/bindConnection
		else if (["SemanticModel", "ItemConnection"].includes(source_Item0.itemType)) {
			const sourceItem = source_Item0 as FabricSemanticModel;
			if (targetItem.itemType == "Connection") {
				const target = targetItem as FabricConnection;
				const connectionDef = targetItem.itemDefinition;

				const bindConnection = async () => {
					const body = {
						"connectionBinding": {
							"id": connectionDef.id,
							"connectivityType": connectionDef.connectivityType,
							"connectionDetails": {
								"type": connectionDef.connectionDetails.type,
								"path": connectionDef.connectionDetails.path
							}
						}
					};
					let apiPath = `/v1/workspaces/${sourceItem.workspaceId}/semanticModels/${sourceItem.itemId}/bindConnection`
					
					if(sourceItem.itemType == "ItemConnection") {
						apiPath = `/v1/workspaces/${sourceItem.workspaceId}/semanticModels/${sourceItem.parent.parent.itemId}/bindConnection`
					}

					const response = await FabricApiService.post(apiPath, body);
					
					if (response.error) {
						ThisExtension.Logger.logError(`Error binding connection to semantic model: ${response.error.message}`, true);
						return;
					}
					else {
						ThisExtension.Logger.logInfo(`Successfully bound connection '${connectionDef.displayName}' to semantic model '${sourceItem.itemName}'`);
					}
					
					ThisExtension.TreeViewWorkspaces.refresh(sourceItem.parent, false, true);
				};

				actions.set("Bind Connection", bindConnection);
			}
		}
		// there are multiple item types for Fabric Items, so we cannot rely on the itemType but use the contextvalue instead
		else if (source_Item0.contextValue?.includes("FABRIC_ITEM")) {
			const sourceItem = source_Item0 as FabricWorkspaceTreeItem;
			const items = sourceItems.map(x => x as FabricWorkspaceTreeItem);
			const target = targetItem as FabricWorkspaceTreeItem;

			if (items.every(x => x.canMove)) {
				const bulkMoveItems = async () => {
					let body = {
						"items": items.map(x => x.itemId)
					};
					// if the target is a folder, we need to pass the targetFolderId
					if (["WorkspaceFolder"].includes(targetItem.itemType)) {
						body["targetFolderId"] = target.itemId;
					}

					FabricApiService.post(`/v1/workspaces/${target.workspaceId}/items/bulkMove`, body);
					ThisExtension.TreeViewWorkspaces.refresh(target.parent, false, true);
				}

				actions.set(`Move Item(s)`, bulkMoveItems);
			}
			else {
				const msg: string = "One or more of the dropped items cannot be moved!"
				ThisExtension.Logger.logWarning(msg, true);
				return;
			}
		}


		// if (source.itemType == "Workspace") {
		// 	// dropping a Group/Workspace on a Capacity --> assign to that capacity
		// 	if (["CAPACITY"].includes(target.itemType)) {
		// 		const assignCapacity = async () => FabricWorkspace.assignToCapacity((source as FabricWorkspace), { capacityId: (target as FabricCapacity).uid });
		// 		actions.set("Assign to Capacity", assignCapacity);
		// 		treeViewtoRefresh = source.TreeProvider;
		// 	}
		// 	// dropping a Group/Workspace on a Capacity --> assign to that pipeline stage
		// 	if (["PIPELINESTAGE"].includes(target.itemType)) {
		// 		const assignStage = async () => FabricPipelineStage.assignWorkspace(target as FabricPipelineStage, { workspaceId: source.uid });
		// 		actions.set("Assign to Stage", assignStage);
		// 	}
		// }
		// else if (source.itemType == "REPORT") {

		// 	const clone = async (targetWorkspaceId, targetModelId = undefined) => {
		// 			const defaultName = targetGroup == sourceGroup ? source.name + " - Copy" : source.name;
		// 			const newReportName = await FabricCommandBuilder.showInputBox(defaultName, "Clone Report", "Enter a name for the cloned report");
		// 			FabricReport.clone(source as FabricReport, {
		// 				name: newReportName,
		// 				targetModelId: targetModelId,
		// 				targetWorkspaceId: targetWorkspaceId
		// 			})
		// 		};

		// 	// dropping a Report on a Group/Workspace or the Reports folder underneath --> create a copy of the report
		// 	if (["GROUP", "REPORTS"].includes(target.itemType)) {
		// 		actions.set("Clone", () => clone(targetGroup));
		// 	}
		// 	// dropping a Report on Dataset --> rebind or clone with connection to new dataset
		// 	if (target.itemType == "DATASET") {
		// 		const rebind = async () => FabricReport.rebind(source as FabricReport, { datasetId: target.uid });
		// 		actions.set("Rebind", rebind);

		// 		actions.set("Clone", () => clone(targetGroup, target.uid));
		// 	}
		// 	// dropping a Report on Report --> update content
		// 	else if (target.itemType == "REPORT") {
		// 		const updateContent = async () => FabricReport.updateContent(target as FabricReport, {
		// 			sourceReport: {
		// 				sourceReportId: source.uid,
		// 				sourceWorkspaceId: (source as FabricReport).groupId
		// 			},
		// 			sourceType: "ExistingReport"
		// 		});
		// 		actions.set("Update Content", updateContent);
		// 	}
		// }

		if (actions.size == 1) {
			const action = actions.values().next().value
			await action();
		}
		else if (actions.size >= 2) {
			let items: FabricQuickPickItem[] = [];
			for (const key of actions.keys()) {
				items.push(new FabricQuickPickItem(key));
			}
			const action: FabricQuickPickItem = await vscode.window.showQuickPick(items, { "canPickMany": false, "title": "Select action to perform" });

			if (!action) {
				return;
			}

			await actions.get(action.value)();
		}
		else {
			const msg: string = "No action defined when dropping a '" + source_Item0.itemType + "' on a '" + targetItem.itemType + "'!"
			ThisExtension.Logger.logWarning(msg, true);
		}
	}
}
