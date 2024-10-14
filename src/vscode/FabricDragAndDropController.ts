import * as vscode from 'vscode';

import { ThisExtension, TreeProviderId } from '../ThisExtension';

import { FabricApiTreeItem } from './treeviews/FabricApiTreeItem';
import { FabricWorkspace } from './treeviews/Workspaces/FabricWorkspace';
import { FabricWorkspaceTreeItem } from './treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FabricQuickPickItem } from './input/FabricQuickPickItem';
import { Helper } from '@utils/Helper';
import { FabricWorkspaceRoleAssignment } from './treeviews/Workspaces/FabricWorkspaceRoleAssignment';
import { FabricWorkspaceRoleAssignments } from './treeviews/Workspaces/FabricWorkspaceRoleAssignments';

export const FabricDragMIMEType = "fabricstudiodragdrop";

class FabricObjectTransferItem extends vscode.DataTransferItem {
	constructor(private _nodes: readonly FabricApiTreeItem[]) {
		super(_nodes);
	}

	asObject(): readonly FabricApiTreeItem[] {
		return this._nodes;
	}

	async asString(): Promise<string> {
		return this.jsonifyObject(this.value, 3);
	}

	jsonifyObject(obj: Object, maxLevels: number = 2, currentLevel: number = 0): string {

		if (currentLevel == maxLevels) {
			return "\"MaxRecrusionlevelReached!\"";
		}
		var arrOfKeyVals = [],
			arrVals = [],
			objKeys = [];

		/*********CHECK FOR PRIMITIVE TYPES**********/
		if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null)
			return '' + obj;
		else if (typeof obj === 'string')
			return JSON.stringify(obj);

		/*********CHECK FOR ARRAY**********/
		else if (Array.isArray(obj)) {
			//check for empty array
			if (obj[0] === undefined)
				return '[]';
			else {
				obj.forEach((el) => {
					arrVals.push(this.jsonifyObject(el, maxLevels, currentLevel + 1));
				});
				return '[' + arrVals + ']';
			}
		}
		/*********CHECK FOR OBJECT**********/
		else if (obj instanceof Object) {
			//get object keys
			//objKeys = Object.keys(obj);
			objKeys = this.getAllProperties(obj)
			//set key output;
			objKeys.forEach((key) => {
				var keyOut = JSON.stringify(key) + ':';
				var keyValOut = obj[key];
				//skip functions and undefined properties
				if (keyValOut instanceof Function || typeof keyValOut === undefined)
					arrOfKeyVals.push(keyOut + JSON.stringify("function " + keyValOut + "()"));
				else if (typeof keyValOut === 'string')
					arrOfKeyVals.push(keyOut + JSON.stringify(keyValOut));
				else if (typeof keyValOut === 'boolean' || typeof keyValOut === 'number' || keyValOut === null)
					arrOfKeyVals.push(keyOut + keyValOut);
				//check for nested objects, call recursively until no more objects
				else if (keyValOut instanceof Object) {
					arrOfKeyVals.push(keyOut + this.jsonifyObject(keyValOut, maxLevels, currentLevel + 1));
				}
			});
			return '{' + arrOfKeyVals + '}';
		}
	};

	getAllProperties(obj) {
		let properties = new Set()
		let currentObj = obj
		do {
			Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
		} while ((currentObj = Object.getPrototypeOf(currentObj)))
		return [...properties.keys()].filter((item: string) => !item.startsWith("_"))
	}
}

// https://vshaxe.github.io/vscode-extern/vscode/TreeDataProvider.html
export class FabricDragAndDropController implements vscode.TreeDragAndDropController<FabricApiTreeItem> {

	dropMimeTypes: readonly string[] = ThisExtension.TreeProviderIds.map((x) => x.toString()).concat([
		FabricDragMIMEType,
		"text/uri-list" // to support drag and drop from the file explorer (not yet working)
	]);
	dragMimeTypes: readonly string[] = ThisExtension.TreeProviderIds.map((x) => x.toString()).concat([
		FabricDragMIMEType
	]);

	public async handleDrag?(source: readonly FabricApiTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		dataTransfer.set(source[0].TreeProvider, new FabricObjectTransferItem(source));
		dataTransfer.set(FabricDragMIMEType, new FabricObjectTransferItem(source));
	}

	public async handleDrop?(target: FabricApiTreeItem, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
		ThisExtension.Logger.logInfo("Dropped item(s) on " + target.itemType + " ...");

		// when a PBIX file is dropped on a Group/Workspace or its Datasets folder
		let uriList = await dataTransfer.get("text/uri-list");
		if (uriList != null) {
			if (["XXX_GROUP", "XXX_DATASETS"].includes(target.itemType)) {
				const uriListString = (await uriList.asString());
				ThisExtension.Logger.logInfo("File(s) dropped on Fabric Group: " + uriListString.toString());
				const fileUris = uriListString.split("\r\n").filter((x) => x.startsWith("file://") && x.endsWith(".pbix")).map((x) => vscode.Uri.parse(x.trim()));

				const targetGroup: FabricWorkspace = target.getParentByType("Workspace") as FabricWorkspace;

				const pbixImport = undefined //await FabricWorkspace.uploadPbixFiles(targetGroup, fileUris);
				if (pbixImport) {
					ThisExtension.Logger.logInfo("Imported PBIX: " + pbixImport[0].name + " (" + pbixImport[0].id + ")");
					ThisExtension.refreshTreeView(target.TreeProvider, targetGroup);
				}
				else {
					ThisExtension.Logger.logError("ERROR importing PBIX: " + JSON.stringify(pbixImport, null, 4), true);
				}
				return;
			}
			else {
				ThisExtension.Logger.logWarning("File(s) dropped on Fabric Item but no drop-handler was defined for " + target.itemType);
			}
		}

		const ws = dataTransfer.get("application/vnd.code.tree.fabricstudioworkspaces");
		const transferItem = dataTransfer.get(FabricDragMIMEType);

		if (!transferItem) {
			ThisExtension.Logger.logWarning("Item dropped on Fabric Workspace Tree-View - but MimeType 'application/vnd.code.tree.Fabricworkspaces' was not found!");
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

		/* 
		// TODO
		Workspace -> PipelineStage
		Report -> Dataset (Clone, Rebind)
		Report -> Reports, Workspace (Clone)
		Dashboard -> Dashboard, Workspace (Clone) ?
		*/
		const source_Item0: FabricApiTreeItem = sourceItems[0];

		let actions: Map<string, () => Promise<void>> = new Map<string, () => Promise<void>>();

		// by default we refresh the treeview of the target item
		let treeViewtoRefresh: TreeProviderId = targetItem.TreeProvider;
		const targetGroup = (targetItem as FabricWorkspaceTreeItem).workspace;
		const sourceGroup = (source_Item0 as FabricWorkspaceTreeItem).workspace;

		if (source_Item0.itemType == "WorkspaceRoleAssignment") {
			const sourceItem = source_Item0 as FabricWorkspaceRoleAssignment;
			if (["WorkspaceRoleAssignments"].includes(targetItem.itemType)) {
				const target = targetItem as FabricWorkspaceRoleAssignments;

				const addRoleAssignment = async () => {
					await target.addRoleAssignment(sourceItem.itemDefinition);
					ThisExtension.TreeViewWorkspaces.refresh(target.parent, false);
				}

				actions.set("Add RoleAssignment", addRoleAssignment);
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

		if (actions.size > 0) {
			let items: FabricQuickPickItem[] = [];
			for (const key of actions.keys()) {
				items.push(new FabricQuickPickItem(key));
			}
			const action: FabricQuickPickItem = await vscode.window.showQuickPick(items, {"canPickMany": false, "title": "Select action to perform"});

			if (!action) {
				return;
			}

			await actions.get(action.value)();

			ThisExtension.refreshTreeView(treeViewtoRefresh);
		}
		else {
			const msg: string = "No action defined when dropping a '" + source_Item0.itemType + "' on a '" + targetItem.itemType + "'!"
			ThisExtension.Logger.logWarning(msg);
			Helper.showTemporaryInformationMessage(msg)
		}
	}
}
