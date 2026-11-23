import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { Buffer } from '@env/buffer';

import { FabricFSUri } from './FabricFSUri';
import { FabricFSCacheItem } from './FabricFSCacheItem';
import { FabricApiItemFormat, FabricApiItemType, FabricApiPayloadType, iFabricApiItem, iFabricApiItemDefinition, iFabricApiItemPart, iFabricApiResponse } from '../../fabric/_types';
import { FabricFSWorkspace } from './FabricFSWorkspace';
import { FabricApiService } from '../../fabric/FabricApiService';
import { ThisExtension } from '../../ThisExtension';
import { FabricFSPublishAction } from './_types';
import { FabricFSItemType } from './FabricFSItemType';
import { FabricFSCache } from './FabricFSCache';
import { FabricConfiguration } from '../configuration/FabricConfiguration';
import { FabricMapper } from '../../fabric/FabricMapper';

export class FabricFSItem extends FabricFSCacheItem implements iFabricApiItem {
	id: string;
	displayName: string;
	description: string;
	type: FabricApiItemType;
	workspace: FabricFSWorkspace;
	private _format?: FabricApiItemFormat;
	// modification times of the individual parts - VSCode uses mtime + size to detect conflicting changes
	private _loadTime: number = Date.now();
	private _partMTimes: Map<string, number> = new Map<string, number>();

	constructor(uri: FabricFSUri) {
		super(uri);
	}

	get workspaceId(): string {
		return this.FabricUri.workspaceId;
	}

	get itemId(): string {
		return this.FabricUri.itemId;
	}

	get format(): FabricApiItemFormat {
		if (!this._format) {
			this._format = FabricConfiguration.getFabricItemTypeFormat(this.FabricUri.itemType);
		}
		return this._format;
	}

	get parent(): FabricFSItemType {
		return super.parent as FabricFSItemType;
	}

	getApiResponse<T = iFabricApiItemPart[]>(): T {
		return this._apiResponse as T;
	}

	public async loadStatsFromApi<T>(): Promise<void> {
		const response = await FabricApiService.getItem(this.FabricUri.workspaceId, this.FabricUri.itemId);

		if (response.success) {
			const apiItem = response.success;

			// we might get an error response so we  also need to check for the id
			if (apiItem && apiItem.id) {
				this.id = apiItem.id;
				this.displayName = apiItem.displayName;
				this.description = apiItem.description?.toString();
				this.type = apiItem.type;

				this.publishAction = FabricFSPublishAction.MODIFIED;

				this._stats = {
					type: vscode.FileType.Directory,
					ctime: undefined,
					mtime: undefined,
					size: undefined
				};
			}
			else {
				this._stats = undefined;
			}
		}
		else if (response.error?.errorCode?.toLowerCase().includes("notfound")) {
			// the item does not exist (anymore)
			this._stats = undefined;
		}
		else {
			// any other error (permissions, throttling, network, ...) - do not cache the result so it is retried next time
			throw vscode.FileSystemError.Unavailable(`Could not load item '${this.FabricUri.uri.toString()}': ${response.error?.message}`);
		}
	}

	public async loadChildrenFromApi<T>(): Promise<void> {
		if (!this._children) {
			if (!this._apiResponse) {
				const response = await FabricApiService.getItemDefinitionParts(this.FabricUri.workspaceId, this.FabricUri.itemId, this.format);

				if (response.error) {
					// VSCode shows the thrown error to the user - the children are not marked as loaded so it is retried next time
					ThisExtension.Logger.logError(`Could not load definition of '${this.FabricUri.uri.toString()}': ${response.error.message}`);
					throw vscode.FileSystemError.Unavailable(`Could not load definition of '${this.FabricUri.uri.toString()}': ${response.error.message}`);
				}
				this._apiResponse = response.success;
				this._loadTime = Date.now();
				this._partMTimes.clear();
			}
			this._children = [];

			let folders: [string, vscode.FileType][] = [];
			let files: [string, vscode.FileType][] = [];

			for (let item of this.getApiResponse()) {
				const partParts = item.path.split("/");
				if (partParts.length == 1) {
					let ext = item.path.split('.').pop();
					let fileName = item.path.slice(0, -(ext.length + 1));
					if (FabricConfiguration.getFabricItemTypeUseItemNameAsFileName(this.FabricUri.itemType)
						&& FabricConfiguration.getFabricItemTypeDefinitionFileName(this.FabricUri.itemType) == fileName) {
						
						// rename the part in the API response
						item.path = item.path.replace(fileName, this.displayName);

						fileName = this.displayName;
						// const origPayload = await this.getContentForSubpath(item.path);
						// this._apiResponse.push({ "path": fileName + "." + ext, "payloadType": item.payloadType, "payload": origPayload });
						// this._apiResponse = this._apiResponse.filter((part) => part.path != item.path);
					}
					if(item.path == ".platform" && !FabricConfiguration.loadItemDefinitionPlatformFile) {
						// skip .platform file
						continue;
					}
					files.push([fileName + "." + ext, vscode.FileType.File]);
				}
				else {
					const folderName = partParts[0];
					if (!folders.find((folder) => folder[0] == folderName)) {
						folders.push([folderName, vscode.FileType.Directory]);
					}
				}
			}
			this._children = folders.concat(files);
		}
	}

	/**
	 * Makes sure the definition (parts) of the item is loaded - e.g. if a part is requested before the item was listed (restored editor tabs, ...)
	 */
	public async ensureDefinitionLoaded(): Promise<void> {
		if (!this._apiResponse) {
			await this.readDirectory();
		}
		if (!this._apiResponse) {
			throw vscode.FileSystemError.Unavailable(`Could not load definition of '${this.FabricUri.uri.toString()}'!`);
		}
	}

	private getPartMTime(partPath: string): number {
		return this._partMTimes.get(partPath) ?? this._loadTime;
	}

	private setPartModified(partPath: string): void {
		this._partMTimes.set(partPath, Date.now());
	}

	// the size of the decoded content - the payload is stored base64 encoded
	private static getDecodedSize(payload: string): number {
		if (!payload) {
			return 0;
		}
		const padding = payload.endsWith("==") ? 2 : (payload.endsWith("=") ? 1 : 0);
		return Math.floor(payload.length * 3 / 4) - padding;
	}

	// a path is a folder if any part is stored below it (or a VSCodeFolder marker exists)
	private isFolder(pathDecoded: string): boolean {
		return this.getApiResponse().some((item) => item.path.startsWith(pathDecoded + "/"));
	}

	public getStatsForSubpath(path: string): vscode.FileStat | undefined {
		const pathDecoded = decodeURIComponent(path);
		const fileItem = this.getApiResponse().find((item) => item.path == pathDecoded);
		if (fileItem) {
			return {
				type: vscode.FileType.File,
				ctime: this._loadTime,
				mtime: this.getPartMTime(pathDecoded),
				size: fileItem.payloadType == "InlineBase64" ? FabricFSItem.getDecodedSize(fileItem.payload) : fileItem.payload?.length ?? 0
			};
		}
		if (this.isFolder(pathDecoded)) {
			return {
				type: vscode.FileType.Directory,
				ctime: this._loadTime,
				mtime: this._loadTime,
				size: 0
			};
		}

		// stats are also used to check existence of a file - so we should not show an error message to the user!
		//vscode.window.showErrorMessage("FILE_NOT_FOUND - " + vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded).toString());
		throw vscode.FileSystemError.FileNotFound(vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded));
	}

	public getChildrenForSubpath(path: string): [string, vscode.FileType][] | undefined {
		const pathDecoded = decodeURIComponent(path);
		const items = this.getApiResponse().filter((item) => item.path.startsWith(pathDecoded + "/"));

		let folders: [string, vscode.FileType][] = [];
		let files: [string, vscode.FileType][] = [];

		const pathLength = pathDecoded.split("/").length;
		for (let item of items) {
			const itemParts = item.path.split("/");
			const itemLength = itemParts.length;

			if (pathLength == itemLength - 1) {
				if (item.payloadType == "VSCodeFolder") {
					if (itemParts[itemParts.length - 1] != '') {
						folders.push([itemParts[pathLength - 1], vscode.FileType.Directory]);
					}
				}
				else {
					let fileName = itemParts.pop();
					files.push([fileName, vscode.FileType.File]);
				}
			}
			else {
				const folderName = itemParts[pathLength];
				if (!folders.find((folder) => folder[0] == folderName)) {
					folders.push([folderName, vscode.FileType.Directory]);
				}
			}
		}
		return folders.concat(files);
	}

	public async getContentForSubpath(path: string): Promise<Uint8Array> {
		const pathDecoded = decodeURIComponent(path);
		const apiResponse = this.getApiResponse();
		const item = apiResponse.find((item) => item.path == pathDecoded);
		if (item) {
			if (item.payloadType == "InlineBase64") {
				const payloadBinary = Buffer.from(item.payload, "base64")
				return payloadBinary;
			}
			else {
				ThisExtension.Logger.logError("PAYLOAD_TYPE_NOT_SUPPORTED - PayloadType" + item.payloadType);
				ThisExtension.Logger.logError("PAYLOAD_TYPE_NOT_SUPPORTED - Path: " + path, true, true);
			}
		}

		// VSCode reads files like .vscode/settings.json without checking their existence first - FileNotFound is the expected result, so we must not show an error message to the user!
		ThisExtension.Logger.logDebug("FILE_NOT_FOUND - Path: " + vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded).toString());
		throw vscode.FileSystemError.FileNotFound(vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded));
	}

	public async writeContentToSubpath(path: string, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<boolean> {
		const pathDecoded = decodeURIComponent(path);
		const item = this.getApiResponse().find((item) => item.path == pathDecoded);
		if (item) {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists(vscode.Uri.joinPath(this.FabricUri.uri, path));
			}
			if (item.payloadType != "InlineBase64") {
				throw vscode.FileSystemError.NoPermissions(`Payload type '${item.payloadType}' of '${pathDecoded}' is not supported for writing!`);
			}
			item.payload = Buffer.from(content).toString("base64");
			this.setPartModified(pathDecoded);

			return false;
		}
		else if (this.isFolder(pathDecoded)) {
			throw vscode.FileSystemError.FileIsADirectory(vscode.Uri.joinPath(this.FabricUri.uri, path));
		}
		else if (options.create) {
			await this.addPart(pathDecoded);
			await this.writeContentToSubpath(path, content, { create: false, overwrite: true });
			return true;
		}

		// FileNotFound is the expected result if the file does not exist and should not be created - VSCode handles it, so we must not show an error message to the user!
		ThisExtension.Logger.logDebug("FILE_NOT_FOUND - Path: " + vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded).toString());
		throw vscode.FileSystemError.FileNotFound(vscode.Uri.joinPath(this.FabricUri.uri, pathDecoded));
	}

	public async getItemDefinition(): Promise<iFabricApiItemDefinition> {
		let parts = this.getApiResponse().map(a => {return {...a}});

		parts = parts.filter((part) => part.payloadType != "VSCodeFolder");

		if (FabricConfiguration.getFabricItemTypeUseItemNameAsFileName(this.FabricUri.itemType)) {
			const definitionFileName = FabricConfiguration.getFabricItemTypeDefinitionFileName(this.FabricUri.itemType);
			const definitionPart = FabricFSItem.findDefinitionFilePart(parts, this.displayName);

			if (!definitionPart) {
				ThisExtension.Logger.logError(`Definition file '${this.displayName}.*' not found in item '${this.FabricUri.uri.toString()}'`, true);
				throw vscode.FileSystemError.FileNotFound(this.FabricUri.uri);
			}
			definitionPart.path = definitionPart.path.replace(this.displayName, definitionFileName);
		}

		let definition = { "parts": parts };

		if (this.format && this.format != FabricApiItemFormat.DEFAULT) {
			definition["format"] = this.format;
		}

		return { "definition": definition };
	}

	// finds the definition file in the root of the item that is named after the item (e.g. <displayName>.ipynb)
	private static findDefinitionFilePart(parts: iFabricApiItemPart[], fileName: string): iFabricApiItemPart {
		return parts.find((part) => !part.path.includes("/")
			&& part.payloadType != "VSCodeFolder"
			&& part.path.lastIndexOf(".") > 0
			&& part.path.substring(0, part.path.lastIndexOf(".")) == fileName);
	}

	/**
	 * Called when the item is renamed - for item types that use the item name as file name, the definition file has to be renamed too
	 */
	public async renameDefinitionFile(oldName: string, newName: string): Promise<void> {
		if (!this._apiResponse || !FabricConfiguration.getFabricItemTypeUseItemNameAsFileName(this.FabricUri.itemType)) {
			return;
		}
		const definitionPart = FabricFSItem.findDefinitionFilePart(this.getApiResponse(), oldName);
		if (definitionPart) {
			definitionPart.path = newName + definitionPart.path.substring(oldName.length);
			this.setPartModified(definitionPart.path);

			// reload children from modified API Response
			this._children = undefined;
			await this.loadChildrenFromApi();
		}
	}

	// a copy of the current definition - e.g. to restore it if an operation is aborted
	public getDefinitionSnapshot(): iFabricApiItemPart[] {
		return this.getApiResponse()?.map((part) => ({ ...part }));
	}

	public async restoreDefinitionSnapshot(parts: iFabricApiItemPart[]): Promise<void> {
		this._apiResponse = parts;
		// mark all parts as modified so open editors pick up the restored content
		for (const part of parts ?? []) {
			this.setPartModified(part.path);
		}

		// reload children from modified API Response
		this._children = undefined;
		await this.loadChildrenFromApi();
	}

	public async publish(): Promise<iFabricApiResponse> {
		let definition = await this.getItemDefinition();
		const itemTypeSingular = FabricMapper.getItemTypeSingular(this.FabricUri.itemType);

		if (!this.publishAction) {
			this.publishAction = FabricFSCache.getLocalChanges(this.FabricUri);
		}

		let response;
		// if the item was created locally, we need to use CREATE instead of UPDATE
		if (this.publishAction == FabricFSPublishAction.CREATE) {
			response = await FabricApiService.createItem(this.workspaceId, this.displayName, this.FabricUri.itemType, definition, `Creating ${itemTypeSingular} '${this.displayName}'`);
			if (!response?.error && response?.success?.id) {
				// add NameIdMap for subsequent calls to the created item
				FabricFSUri.addItemNameIdMap(response.success.displayName ?? this.displayName, response.success.id, response.success.workspaceId ?? this.workspaceId, response.success.type ?? this.FabricUri.itemType);
				this.publishAction = FabricFSPublishAction.MODIFIED;
			}
		}
		else if (this.publishAction == FabricFSPublishAction.MODIFIED) {
			response = await FabricApiService.updateItem(this.workspaceId, this.itemId, this.displayName, this.description);

			if (!response || !response.error) {
				// the service requires a .platform part in the definition whenever metadata is updated;
				// if this item's definition never had one (e.g. not returned by the tenant), don't ask for it
				const hasPlatformPart = definition.definition.parts.some((part) => part.path == ".platform");
				response = await FabricApiService.updateItemDefinition(this.workspaceId, this.itemId, definition, hasPlatformPart, `Updating ${itemTypeSingular} '${this.displayName}'`);
			}
		}
		else if (this.publishAction == FabricFSPublishAction.DELETE) {
			response = await FabricApiService.deleteItem(this.workspaceId, this.itemId, `Deleting ${itemTypeSingular} '${this.displayName || this.FabricUri.item}'`);
			// only remove the item locally if it was actually deleted in Fabric
			if (!response?.error) {
				FabricFSCache.removeCacheItem(this);
				this.parent?.removeChild(this.displayName || decodeURIComponent(this.FabricUri.item));
				ThisExtension.FabricFileSystemProvider.fireDeleted(this.FabricUri.uri);
			}
		}
		else {
			// the caller shows the error to the user
			return { error: { errorCode: "UnknownPublishAction", message: `Unknown publish action for item '${this.FabricUri.uri.toString()}'!` } };
		}

		return response;
	}

	// partPathDecoded must already be decoded (not a URI path)
	public async removePart(partPathDecoded: string): Promise<void> {
		let parts = this.getApiResponse();

		this._apiResponse = parts.filter((part) => part.path != partPathDecoded && !part.path.startsWith(partPathDecoded + "/"));
		this._partMTimes.delete(partPathDecoded);

		// reload children from modified API Response
		this._children = undefined;
		await this.loadChildrenFromApi();
	}

	// partPathDecoded must already be decoded (not a URI path)
	public async addPart(partPathDecoded: string, payload: string = "", payloadType: FabricApiPayloadType = "InlineBase64"): Promise<void> {
		let parts = this.getApiResponse();
		let index = parts.findIndex((part) => part.path == partPathDecoded);
		if (index >= 0) {
			throw vscode.FileSystemError.FileExists(vscode.Uri.joinPath(this.FabricUri.uri, partPathDecoded));
		}
		else {
			// a folder marker is not needed anymore once the folder contains a file
			const parentFolder = partPathDecoded.substring(0, partPathDecoded.lastIndexOf("/") + 1);
			this._apiResponse = parts.filter((part) => !(part.payloadType == "VSCodeFolder" && parentFolder && part.path == parentFolder));
			this.getApiResponse().push({ "path": partPathDecoded, "payloadType": payloadType, "payload": payload });
			this.setPartModified(partPathDecoded);
		}

		// reload children from modified API Response
		this._children = undefined;
		await this.loadChildrenFromApi();
	}

	// partPathDecoded must already be decoded (not a URI path)
	public async getPart(partPathDecoded: string): Promise<iFabricApiItemPart> {
		let parts = this.getApiResponse();
		const part = parts.find((part) => part.path == partPathDecoded);

		// part might be not found and undefined! must be checked by caller!
		return part;
	}

	// folderPathDecoded must already be decoded (not a URI path)
	public async getPartsFromFolder(folderPathDecoded: string): Promise<iFabricApiItemPart[]> {
		let parts = this.getApiResponse();
		const partPathDecoded = Helper.trimChar(folderPathDecoded, '/');
		const folderParts = parts.filter((part) => part.path.startsWith(partPathDecoded + "/"));

		return folderParts;
	}

	// folderPathDecoded must already be decoded (not a URI path)
	public async createSubFolder(folderPathDecoded: string): Promise<void> {
		let parts = this.getApiResponse() || [];
		folderPathDecoded = Helper.trimChar(folderPathDecoded, '/');
		// a file with the same name or an existing folder (with files or a folder marker)
		if (parts.some((part) => part.path == folderPathDecoded || part.path.startsWith(folderPathDecoded + "/"))) {
			throw vscode.FileSystemError.FileExists(vscode.Uri.joinPath(this.FabricUri.uri, folderPathDecoded));
		}
		else {
			parts.push({ "path": folderPathDecoded + "/", "payloadType": "VSCodeFolder", "payload": "" });
			this._apiResponse = parts;
		}

		// reload children from modified API Response
		this._children = undefined;
		await this.loadChildrenFromApi();
	}

	public async delete(): Promise<void> {
		// if the item was created locally, we need to remove it locally only
		if (this.publishAction == FabricFSPublishAction.CREATE) {
			// remove it from the cache and from the parent
			FabricFSCache.removeCacheItem(this);
			this.parent?.removeChild(this.displayName || decodeURIComponent(this.FabricUri.item));
		}
		else {
			this.publishAction = FabricFSPublishAction.DELETE;
		}
	}
}