import * as vscode from 'vscode';
import { Helper } from '@utils/Helper';

const API_ROOT_PATH_ALIASES = ["PATH", "DATASET", "DATASET_PATH", "API_ROOT_PATH", "APIROOTPATH", "API_PATH", "APIPATH", "ROOTPATH", "ROOT_PATH"];
export class FabricNotebookContext {
	apiRootPath: string;
	uri: vscode.Uri;
	variables: { [key: string]: string } = {};

	constructor(apiRootPath: string) {
		this.apiRootPath = apiRootPath;
	}

	public setVariable(name: string, value: string): void {
		if (API_ROOT_PATH_ALIASES.includes(name.toUpperCase())) {
			this.apiRootPath = value;
		}
		else {
			this.variables[name.toUpperCase()] = value;
		}
	}

	public getVariable(name: string): string {
		if (API_ROOT_PATH_ALIASES.includes(name.toUpperCase())) {
			return this.apiRootPath;
		}
		return this.variables[name.toUpperCase()];
	}

	//#region static methods to track the context of the notebook
	private static _context: Map<string, FabricNotebookContext> = new Map<string, FabricNotebookContext>();


	static loadFromMetadata(metadata?: { [key: string]: any }): { [key: string]: any } {

		if (metadata == undefined) {
			metadata = {};
		}
		let newContext: FabricNotebookContext = FabricNotebookContext.generateFromOriginalMetadata(metadata);
		let guid = Helper.newGuid(); // we always generate a new guid for the current session

		FabricNotebookContext.set(guid, newContext);

		metadata.guid = guid;
		// remove context so it is not used unintentionally
		metadata.context = undefined;

		// we only return the guid as metadata
		return metadata;
	}

	static saveToMetadata(metadata: { [key: string]: any }): { [key: string]: any } {
		if (metadata?.guid) {
			metadata.context = FabricNotebookContext.get(metadata.guid);
			metadata.guid = undefined;
		}

		// we only return the context as metadata
		return metadata;
	}

	static generateFromOriginalMetadata(metadata?: { [key: string]: any }): FabricNotebookContext {
		let newContext = new FabricNotebookContext('/');

		if (metadata?.context) {
			if (metadata.context.apiRootPath) {
				newContext.apiRootPath = metadata.context.apiRootPath;
			}
			if (metadata.context.uri) {
				newContext.uri = metadata.context.uri;
			}
			if (metadata.context.variables) {
				newContext.variables = metadata.context.variables;
			}
		}

		return newContext;
	}

	static set(guid: string, context: FabricNotebookContext): void {
		FabricNotebookContext._context.set(guid, context);
	}

	static get(guid: string): FabricNotebookContext {
		return FabricNotebookContext._context.get(guid);
	}

	static getForUri(uri: vscode.Uri): FabricNotebookContext {
		const items = FabricNotebookContext._context;

		for(let context of items.values()) {
			if(context.uri && context.uri.path == uri.path) {
				return context;
			}
		}
		return undefined;
	}
	//#endregion
}