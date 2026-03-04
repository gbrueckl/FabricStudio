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

	// AIDEV-NOTE: Synthetic workspace entry cached once so individual file processors can reference it as parent.
	private static readonly WORKSPACE_DETAILS: iFabricItemDetails = {
		itemId: EMPTY_GUID,
		itemName: "Current Workspace",
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

	/**
	 * Reads, parses, and caches a single `.platform` file.
	 * @param fileUri URI of the `.platform` file to process.
	 * @param progress Shared progress reporter for the notification bar.
	 * @param token Cancellation token — checked before I/O begins.
	 * @param index Zero-based index of this file in the batch.
	 * @param totalFiles Total number of files being processed.
	 * @returns `true` if the file was successfully parsed and cached, `false` otherwise.
	 */
	// AIDEV-NOTE: Self-contained per-file processor — called in parallel from parsePlatformFiles().
	private static async processPlatformFile(
		fileUri: vscode.Uri,
		progress: vscode.Progress<{ increment?: number; message?: string }>,
		token: vscode.CancellationToken,
		index: number,
		totalFiles: number
	): Promise<boolean> {
		const incrementPerFile = (1 / totalFiles) * 100;

		// AIDEV-NOTE: Early exit when the user cancels — avoids starting new I/O.
		if (token.isCancellationRequested) {
			return false;
		}

		let content: string;
		try {
			content = Buffer.from(await vscode.workspace.fs.readFile(fileUri)).toString("utf8");
		} catch (error) {
			ThisExtension.Logger.logWarning(`Failed to read .platform file '${fileUri.fsPath}': ${error}`);
			return false;
		}

		if (token.isCancellationRequested) {
			return false;
		}

		let platformContent: iFabricPlatformFile;
		try {
			platformContent = JSON.parse(content);
		} catch (error) {
			ThisExtension.Logger.logWarning(`Failed to parse .platform file '${fileUri.fsPath}': ${error}`);
			return false;
		}

		const logicalId = platformContent?.config?.logicalId;
		const displayName = platformContent?.metadata?.displayName;
		const itemType = platformContent?.metadata?.type;

		if (!logicalId) {
			ThisExtension.Logger.logWarning(`Skipping .platform file '${fileUri.fsPath}': missing logicalId.`);
			return false;
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
			parent: FabricPlatformParser.WORKSPACE_DETAILS,
			filePath: fileUri
		};

		await FabricGUIDHoverProvider.cacheFabricObjectName(logicalId, itemDetails);

		progress.report({
			increment: incrementPerFile,
			message: `(${index + 1}/${totalFiles}) ${fileUri.fsPath}`
		});

		ThisExtension.Logger.logInfo(`Cached .platform item '${displayName}' (${itemType}) with logicalId '${logicalId}'.`);
		return true;
	}

	/**
	 * Searches all workspace folders for `.platform` files, processes them
	 * in parallel, and caches each item in global state keyed by its logicalId.
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
				cancellable: true
			},
			async (progress, token) => {
				await FabricGUIDHoverProvider.cacheFabricObjectName(EMPTY_GUID, FabricPlatformParser.WORKSPACE_DETAILS);

				const totalFiles = platformFiles.length;

				// AIDEV-NOTE: perf — process all files in parallel; each call reads, parses, and caches independently.
				const results = await Promise.all(
					platformFiles.map((fileUri, i) =>
						FabricPlatformParser.processPlatformFile(fileUri, progress, token, i, totalFiles)
					)
				);

				const parsedCount = results.filter(Boolean).length;

				if (token.isCancellationRequested) {
					ThisExtension.Logger.logInfo(`Parsing cancelled. Cached ${parsedCount} item(s) before cancellation.`);
					vscode.window.showWarningMessage(`Fabric Studio: Parsing cancelled. ${parsedCount} .platform file(s) cached before cancellation.`);
				} else {
					ThisExtension.Logger.logInfo(`Successfully parsed and cached ${parsedCount} item(s) from ${totalFiles} .platform file(s).`);
					vscode.window.showInformationMessage(`Fabric Studio: Parsed ${parsedCount} .platform file(s) from workspace.`);
				}
			}
		);
	}
}
