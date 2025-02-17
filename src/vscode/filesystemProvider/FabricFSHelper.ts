import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricFSUri, FabricUriType } from './FabricFSUri';
import { FabricFSCache } from './FabricFSCache';
import { FabricCommandBuilder } from '../input/FabricCommandBuilder';
import { FabricWorkspaceTreeItem } from '../treeviews/Workspaces/FabricWorkspaceTreeItem';
import { FABRIC_SCHEME } from './FabricFileSystemProvider';

export abstract class FabricFSHelper {

	static async getTMDLRoot(uri: vscode.Uri): Promise<vscode.Uri> {
		const parts = uri.toString().split("/")

		if (parts.includes("definition")) {
			const definitionUri = Helper.trimChar(Helper.joinPath(...parts.slice(undefined, parts.indexOf("definition") + 1)), "/");
			return vscode.Uri.parse(definitionUri);
		}

		return undefined;
	}

	static async publishTMDLFromLocal(sourceUri: vscode.Uri): Promise<FabricFSUri> {
		let semanticModels = FabricCommandBuilder.getQuickPickItems("SemanticModel")

		if (semanticModels.length == 0 || semanticModels[0].value == "NO_ITEMS_FOUND") {
			const dummyRoot = await ThisExtension.TreeViewWorkspaces.getChildren();
			const workspaces = FabricCommandBuilder.getQuickPickItems("Workspace");
			const workspace = await FabricCommandBuilder.showQuickPick(workspaces, "Select Workspace to publish TMDL to", "", "");

			if (!workspace || workspace.value == "NO_ITEMS_FOUND") {
				return undefined;
			}

			const dummyWs = await workspace.apiItem.getChildren();
			semanticModels = FabricCommandBuilder.getQuickPickItems("SemanticModel")
		}

		const target = await FabricCommandBuilder.showQuickPick(semanticModels, "Select target Semantic Model to publish TMDL to", "", "");

		if (!target || target.value == "NO_ITEMS_FOUND") {
			return undefined;
		}
		const targetModel = target.apiItem as FabricWorkspaceTreeItem;
		const targetFsUri: FabricFSUri = new FabricFSUri(vscode.Uri.joinPath(targetModel.fabricFsUri.uri, "definition"));

		const sourceFsUri: vscode.Uri = await FabricFSHelper.getTMDLRoot(sourceUri);

		if (!sourceFsUri) {
			ThisExtension.Logger.logError("Could not find TMDL root folder 'definition' as partent of '" + sourceUri.toString() + "'!", true);
			return;
		}

		await this.publishTMDL(sourceFsUri, targetFsUri);
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

	static async publishTMDL(sourceUri: vscode.Uri, fabricUri: FabricFSUri): Promise<void> {
		ThisExtension.Logger.logInfo("Publishing TMDL file: " + sourceUri.toString());
		const definitionRoot: vscode.Uri = await FabricFSHelper.getTMDLRoot(sourceUri);

		if (!sourceUri.path.endsWith("definition")) {
			ThisExtension.Logger.logError("Source must be 'definition'-folder - found: '" + sourceUri.toString() + "'!", true);
			return;
		}


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
