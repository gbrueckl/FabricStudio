import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { FabricFSUri, FabricUriType } from './FabricFSUri';
import { Helper } from '@utils/Helper';
import { FabricFSCache } from './FabricFSCache';
import { FabricFSPublishAction } from './_types';

export class FabricFSCacheItem {

	protected _uri: FabricFSUri;
	private _statsLoaded: boolean = false;
	private _childrenLoaded: boolean = false;
	private _statsLoad: Promise<vscode.FileStat | undefined> | undefined;
	private _childrenLoad: Promise<[string, vscode.FileType][] | undefined> | undefined;
	protected _stats: vscode.FileStat | undefined;
	protected _children: [string, vscode.FileType][] | undefined;
	protected _content: Uint8Array | undefined;
	protected _apiResponse: any;
	protected _isLocalOnly: boolean = false;
	protected _publishAction: FabricFSPublishAction
	protected _parent: FabricFSCacheItem;

	constructor(uri: FabricFSUri) {
		this._uri = uri;
	}

	public initializeEmpty(apiResponse: any = undefined): void {
		this._statsLoaded = true;
		this._stats = {
			type: vscode.FileType.Directory,
			ctime: undefined,
			mtime: undefined,
			size: undefined
		};

		this._childrenLoaded = true;
		this._children = [];

		this._apiResponse = apiResponse;
	}

	get UriType(): FabricUriType {
		return this._uri.uriType;
	}

	get FabricUri(): FabricFSUri {
		return this._uri
	}

	get uri(): vscode.Uri {
		return this.FabricUri.uri;
	}

	getApiResponse<T>(): T {
		return this._apiResponse as T;
	}

	get publishAction(): FabricFSPublishAction {
		return this._publishAction;
	}

	set publishAction(value: FabricFSPublishAction) {
		this._publishAction = value;
	}

	get parent(): FabricFSCacheItem {
		return FabricFSCache.getCacheItem(new FabricFSUri(Helper.parentUri(this.uri)));
	}

	public async stats(): Promise<vscode.FileStat | undefined> {
		if (this._statsLoaded) {
			return this._stats;
		}

		if (!this._statsLoad) {
			this._statsLoad = this.loadStats();
		}

		return this._statsLoad;
	}

	public async readDirectory(): Promise<[string, vscode.FileType][] | undefined> {
		if (this._childrenLoaded) {
			return this._children;
		}

		if (!this._childrenLoad) {
			this._childrenLoad = this.loadChildren();
		}

		return this._childrenLoad;
	}

	private async loadStats(): Promise<vscode.FileStat | undefined> {
		try {
			ThisExtension.Logger.logInfo(`Loading Fabric URI Stats ${this.uri.toString()} ...`);
			await this.loadStatsFromApi();
			this._statsLoaded = true;
			return this._stats;
		}
		finally {
			this._statsLoad = undefined;
		}
	}

	private async loadChildren(): Promise<[string, vscode.FileType][] | undefined> {
		try {
			ThisExtension.Logger.logInfo(`Loading Fabric URI Children ${this.uri.toString()} ...`);
			await this.loadChildrenFromApi();
			this._childrenLoaded = true;
			return this._children;
		}
		finally {
			this._childrenLoad = undefined;
		}
	}

	public async readFile(): Promise<Uint8Array | undefined> {
		throw new Error("Method not implemented.");
	}

	async writeFile(content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
		throw new Error("Method not implemented.");
	}

	public async loadChildrenFromApi<T>(): Promise<void> {

	}

	public async loadStatsFromApi<T>(): Promise<void> {

	}

	public addChild(name: string, type: vscode.FileType): void {
		if (!this._children) {
			this._children = [];
		}
		this._children.push([name, type]);
	}

	public removeChild(name: string): void {
		if (this._children) {
			this._children = this._children.filter((value) => value[0] != name);
		}
	}
}
