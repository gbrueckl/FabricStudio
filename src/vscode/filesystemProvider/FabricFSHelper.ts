import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricFSUri } from './FabricFSUri';
import { FabricFSCache } from './FabricFSCache';
import { FabricCommandBuilder } from '../input/FabricCommandBuilder';
import { FabricWorkspaceTreeItem } from '../treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';
import { FabricApiItemType } from '../../fabric/_types';

export abstract class FabricFSHelper {

	static async getDefinitionRoot(uri: vscode.Uri, rootFolderName: string = "definition"): Promise<vscode.Uri> {
		const parts = uri.toString().split("/")

		if (parts.includes(rootFolderName)) {
			const definitionUri = Helper.trimChar(Helper.joinPath(...parts.slice(undefined, parts.indexOf(rootFolderName) + 1)), "/");
			return vscode.Uri.parse(definitionUri);
		}

		return undefined;
	}

	static async ensureParents(fabricUri: FabricFSUri): Promise<void> {
		const parts = fabricUri.uri.path.split("/").filter((part) => part.length > 0);

		for (let i = 0; i < parts.length; i++) {
			const parentUri = new FabricFSUri(vscode.Uri.parse(`${FABRIC_SCHEME}://${Helper.joinPath(...parts.slice(0, i + 1))}`));
			let item = FabricFSCache.getCacheItem(parentUri);
			if (!item) {
				item = await FabricFSCache.addCacheItem(parentUri);
				await item.loadStatsFromApi();
				await item.loadChildrenFromApi();
			}
		}
	}

	static async getTargetFromQuickPick(itemType: FabricApiItemType): Promise<FabricWorkspaceTreeItem> {
		let qpItems = FabricCommandBuilder.getQuickPickItems(itemType)

		if (qpItems.length == 0 || qpItems[0].value == "NO_ITEMS_FOUND") {
			const dummyRoot = await ThisExtension.TreeViewWorkspaces.getChildren();
			const workspaces = FabricCommandBuilder.getQuickPickItems("Workspace");
			const workspace = await FabricCommandBuilder.showQuickPick(workspaces, "Select target Workspace to publish to", "", "");

			if (!workspace || workspace.value == "NO_ITEMS_FOUND") {
				return undefined;
			}

			const dummyWs = await workspace.apiItem.getChildren();
			qpItems = FabricCommandBuilder.getQuickPickItems(itemType)
		}

		// add new option to ceate new item

		const target = await FabricCommandBuilder.showQuickPick(qpItems, `Select target ${itemType} to publish to`, "", "");

		if (!target || target.value == "NO_ITEMS_FOUND") {
			return undefined;
		} 
		return target.apiItem as FabricWorkspaceTreeItem;
	}

	static async publishTMDLFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		const definitionFolder = "definition"
		const target = await this.getTargetFromQuickPick("SemanticModel");
		if(!target) {	
			ThisExtension.Logger.logInfo("No target selected, aborting publish operation.");
			return;
		}

		const targetFsUri: FabricFSUri = new FabricFSUri(vscode.Uri.joinPath(target.fabricFsUri.uri, definitionFolder));

		const sourceFsUri: vscode.Uri = await FabricFSHelper.getDefinitionRoot(sourceUri, definitionFolder);

		if (!sourceFsUri) {
			ThisExtension.Logger.logError(`Could not find TMDL root folder '${definitionFolder}' as partent of '${sourceUri.toString()}'!`, true);
			return;
		}

		await this.publishContent(sourceFsUri, targetFsUri);
	}

	static async publishPBIRFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		const definitionFolder = "definition"
		const target = await this.getTargetFromQuickPick("Report");
		if(!target) {	
			ThisExtension.Logger.logInfo("No target selected, aborting publish operation.");
			return;
		}

		const targetFsUri: FabricFSUri = new FabricFSUri(vscode.Uri.joinPath(target.fabricFsUri.uri, definitionFolder));

		const sourceFsUri: vscode.Uri = await FabricFSHelper.getDefinitionRoot(sourceUri, definitionFolder);

		if (!sourceFsUri) {
			ThisExtension.Logger.logError(`Could not find PBIR root folder '${definitionFolder}' as partent of '${sourceUri.toString()}'!`, true);
			return;
		}

		await this.publishContent(sourceFsUri, targetFsUri);
	}

	static async publishContent(sourceUri: vscode.Uri, fabricUri: FabricFSUri): Promise<void> {
		ThisExtension.Logger.logInfo("Publishing from: " + sourceUri.toString());
		ThisExtension.Logger.logInfo("To Fabric target: " + fabricUri.uri.toString());
		const definitionRoot: vscode.Uri = await FabricFSHelper.getDefinitionRoot(sourceUri);

		await this.ensureParents(fabricUri);
		// delete current definition from Target
		await vscode.workspace.fs.delete(fabricUri.uri, { recursive: true, useTrash: false });
		// copy new definition from source
		await vscode.workspace.fs.copy(definitionRoot, fabricUri.uri, { overwrite: true });
		// mark target as modified
		await FabricFSCache.localItemModified(fabricUri);

		await FabricFSCache.publishToFabric(fabricUri.uri);
	}
}
