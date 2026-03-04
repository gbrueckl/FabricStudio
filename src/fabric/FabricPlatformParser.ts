import * as vscode from 'vscode';

import { ThisExtension } from '../ThisExtension';
import { iFabricPlatformFile } from './_types';
import { FabricGUIDHoverProvider, iFabricItemDetails } from '../vscode/hoverProvider/FabricGUIDHoverProvider';

// AIDEV-NOTE: Parses .platform files from local Fabric Git repos to resolve logicalIds via the hover provider.
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const PLATFORM_FILE_GLOB = "**/.platform";

/**
 * Parses `.platform` files found in the current VSCode workspace folders.
 * Each file contains metadata (type, displayName) and a config with a logicalId.
 * Parsed items are cached in global state so the hover provider can resolve logicalIds.
 */
export abstract class FabricPlatformParser {

	/**
	 * Searches all workspace folders for `.platform` files, parses them,
	 * and caches each item in global state keyed by its logicalId.
	 * Shows a progress bar while processing and logs each file individually.
	 */
	public static async parsePlatformFiles(): Promise<void> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			ThisExtension.Logger.logWarning("No workspace folders found. Cannot parse .platform files.");
			return;
		}

		ThisExtension.Logger.logInfo("Scanning workspace for .platform files ...");

		const allPlatformFiles = await vscode.workspace.findFiles(PLATFORM_FILE_GLOB);

		// AIDEV-NOTE: Only consider local (file://) URIs — excludes virtual file systems like fabric://.
		const platformFiles = allPlatformFiles.filter(uri => uri.scheme === "file");

		if (platformFiles.length === 0) {
			ThisExtension.Logger.logInfo("No local .platform files found in the current workspace.");
			return;
		}

		ThisExtension.Logger.logInfo(`Found ${platformFiles.length} local .platform file(s). Parsing ...`);

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Parsing .platform files",
				cancellable: false
			},
			async (progress) => {
				// AIDEV-NOTE: Cache a synthetic workspace entry so the hover provider can resolve the workspace name.
				const workspaceDetails: iFabricItemDetails = {
					itemId: EMPTY_GUID,
					itemName: "<Current Workspace>",
					apiPath: "",
					itemType: "Workspace",
					itemDefinition: undefined,
					canDelete: false,
					canRename: false,
					canOpenInBrowser: false,
					treeProvider: "",
					contextValue: "WORKSPACE",
					workspaceId: EMPTY_GUID,
					parent: undefined
				};
				await FabricGUIDHoverProvider.cacheFabricObjectName(EMPTY_GUID, workspaceDetails);

				let parsedCount = 0;
				const totalFiles = platformFiles.length;

				for (let i = 0; i < totalFiles; i++) {
					const fileUri = platformFiles[i];
					progress.report({
						increment: (1 / totalFiles) * 100,
						message: `(${i + 1}/${totalFiles}) ${fileUri.fsPath}`
					});

					ThisExtension.Logger.logInfo(`Processing .platform file (${i + 1}/${totalFiles}): '${fileUri.fsPath}' ...`);

					try {
						const content = Buffer.from(await vscode.workspace.fs.readFile(fileUri)).toString("utf8");
						const platformContent: iFabricPlatformFile = JSON.parse(content);

						const logicalId = platformContent?.config?.logicalId;
						const displayName = platformContent?.metadata?.displayName;
						const itemType = platformContent?.metadata?.type;

						if (!logicalId) {
							ThisExtension.Logger.logWarning(`Skipping .platform file '${fileUri.fsPath}': missing logicalId.`);
							continue;
						}

						const itemDetails: iFabricItemDetails = {
							itemId: logicalId,
							itemName: displayName || "Unknown",
							apiPath: "",
							itemType: itemType || "GenericItem",
							itemDefinition: undefined,
							canDelete: false,
							canRename: false,
							canOpenInBrowser: false,
							treeProvider: "",
							contextValue: (itemType || "GENERICITEM").toUpperCase(),
							workspaceId: EMPTY_GUID,
							parent: workspaceDetails
						};

						await FabricGUIDHoverProvider.cacheFabricObjectName(logicalId, itemDetails);
						parsedCount++;

						ThisExtension.Logger.logInfo(`Cached .platform item '${displayName}' (${itemType}) with logicalId '${logicalId}'.`);
					} catch (error) {
						ThisExtension.Logger.logWarning(`Failed to parse .platform file '${fileUri.fsPath}': ${error}`);
					}
				}

				ThisExtension.Logger.logInfo(`Successfully parsed and cached ${parsedCount} item(s) from ${totalFiles} .platform file(s).`);
				vscode.window.showInformationMessage(`Fabric Studio: Parsed ${parsedCount} .platform file(s) from workspace.`);
			}
		);
	}
}
