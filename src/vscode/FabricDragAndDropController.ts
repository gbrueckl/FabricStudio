import * as vscode from 'vscode';

import { ThisExtension, TreeProviderId } from '../ThisExtension';

import { FabricApiTreeItem } from './treeviews/FabricApiTreeItem';
import { FabricWorkspace } from './treeviews/Workspaces/FabricWorkspace';
import { FabricWorkspaceTreeItem } from './treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FabricQuickPickItem } from './input/FabricQuickPickItem';
import { FabricWorkspaceRoleAssignment } from './treeviews/Workspaces/FabricWorkspaceRoleAssignment';
import { FabricWorkspaceRoleAssignments } from './treeviews/Workspaces/FabricWorkspaceRoleAssignments';
import { FabricGatewayRoleAssignment } from './treeviews/Connections/FabricGatewayRoleAssignment';
import { FabricGatewayRoleAssignments } from './treeviews/Connections/FabricGatewayRoleAssignments';
import { FabricConnectionRoleAssignment } from './treeviews/Connections/FabricConnectionRoleAssignment';
import { FabricConnectionRoleAssignments } from './treeviews/Connections/FabricConnectionRoleAssignments';
import { FabricCapacity } from './treeviews/Capacities/FabricCapacity';
import { FabricWorkspaceFolder } from './treeviews/Workspaces/FabricWorkspaceFolder';
import { FabricApiService } from '../fabric/FabricApiService';

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
		dataTransfer.set(FabricDragMIMEType, new FabricObjectTransferItem(source));
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
		ThisExtension.Logger.logDebug("TransferItem: \n" + transferItem.value);
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

		let actions: Map<string, () => Promise<void>> = new Map<string, () => Promise<void>>();

		// by default we refresh the treeview of the target item
		let treeViewtoRefresh: TreeProviderId = targetItem.treeProvider;

		if (source_Item0.itemType == "WorkspaceRoleAssignment") {
			const sourceItem = source_Item0 as FabricWorkspaceRoleAssignment;
			if (["WorkspaceRoleAssignments"].includes(targetItem.itemType)) {
				const target = targetItem as FabricWorkspaceRoleAssignments;

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewWorkspaces.refresh(target.parent, false);
				}

				actions.set("Add WorkspaceRoleAssignment", addRoleAssignment);
			}
		}
		else if (source_Item0.itemType == "GatewayRoleAssignment") {
			const sourceItem = source_Item0 as FabricGatewayRoleAssignment;
			if (["GatewayRoleAssignments"].includes(targetItem.itemType)) {
				const target = targetItem as FabricGatewayRoleAssignments;

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewConnections.refresh(target.parent, false);
				}

				actions.set("Add GatewayRoleAssignment", addRoleAssignment);
			}
		}
		else if (source_Item0.itemType == "ConnectionRoleAssignment") {
			const sourceItem = source_Item0 as FabricConnectionRoleAssignment;
			if (["ConnectionRoleAssignments"].includes(targetItem.itemType)) {
				const target = targetItem as FabricConnectionRoleAssignments;

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewConnections.refresh(target.parent, false);
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
					ThisExtension.TreeViewConnections.refresh(target.parent, false);
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
					ThisExtension.TreeViewConnections.refresh(target.parent, false);
				}
				treeViewtoRefresh = target.treeProvider;
				actions.set("Move to Workspace Root", moveToWorkspaceRoot);

			}
		}
		// there are multiple item types for Fabric Items, so we cannot rely on the itemType but use the contextvalue instead
		else if (source_Item0.contextValue.includes("FABRIC_ITEM")) {
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
					ThisExtension.TreeViewConnections.refresh(target.parent, false);
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

			ThisExtension.refreshTreeView(treeViewtoRefresh);
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

			ThisExtension.refreshTreeView(treeViewtoRefresh);
		}
		else {
			const msg: string = "No action defined when dropping a '" + source_Item0.itemType + "' on a '" + targetItem.itemType + "'!"
			ThisExtension.Logger.logWarning(msg, true);
		}
	}
}
