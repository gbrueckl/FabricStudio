import * as vscode from 'vscode';

import { Buffer } from '@env/buffer';
import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../ThisExtension';
import { ApiEndpointDetails, FabricAPILanguage, KeyValuePair, SwaggerFile } from './_types';
import { FabricNotebookContext } from '../notebook/FabricNotebookContext';
import { FabricApiService } from '../../fabric/FabricApiService';
import { iFabricApiItem } from '../../fabric/_types';
import * as SwaggerParser from "@apidevtools/swagger-parser";
import { sortedLastIndex } from 'lodash';


/** Supported trigger characters */
const TRIGGER_CHARS = ['/', '%'];

/** sometimes the API is not consistent and Swagger-definition is different from whats returned by the API  */
const LIST_ITEM_OVERWRITE = {
	"refreshId": "requestId",
	"stageOrder": "order"
}

/** black list of properties that are not exposed in the details of the popup
 *  by default all strings > 100 chars are not shown anyway
 */
const DETAILS_BLACKLIST = ["webUrl"];


export class FabricAPICompletionProvider implements vscode.CompletionItemProvider {

	static swagger: SwaggerFile;

	constructor(context: vscode.ExtensionContext) {

		const completionProvider = vscode.languages.registerCompletionItemProvider([FabricAPILanguage],
			this,
			...TRIGGER_CHARS);

		context.subscriptions.push(completionProvider);
	}

	static async onDidOpenNotebookDocument(document: vscode.NotebookDocument): Promise<void> {
		if (document.uri.fsPath.endsWith('.fabnb')) {
			ThisExtension.Logger.logDebug("Loading Swagger file for Fabric API Completion Provider ...");
			await FabricAPICompletionProvider.loadSwaggerFile();
		}
	}

	static async loadSwaggerFile(): Promise<void> {
		if (FabricAPICompletionProvider.swagger) {
			return;
		}
		const swaggerPath = vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'API', 'swagger.json');

		//let api = await SwaggerParser.validate(swaggerPath.fsPath, { validate: { spec: false, schema: false } });
		const swaggerText = Buffer.from(await vscode.workspace.fs.readFile(swaggerPath)).toString();
		FabricAPICompletionProvider.swagger = JSON.parse(swaggerText);
	}

	async getAvailableEndpoints(searchPath: string, method: string = undefined, showOtherMethods: boolean = false): Promise<ApiEndpointDetails[]> {
		if (method) {
			method = method.toLowerCase();
		}
		ThisExtension.Logger.logDebug("Searching for API paths starting with '" + searchPath + "' ...");

		const searchParts = searchPath.split("/");
		let matches: ApiEndpointDetails[] = [];
		let matchesDifferentMethod: ApiEndpointDetails[] = [];
		for (let item of Object.getOwnPropertyNames(FabricAPICompletionProvider.swagger.paths)) {
			// within the same path as the typed path 
			if (item.startsWith(searchPath)) {
				const parts = item.split("/");
				// all APIs directly below the current path and all dynamic paths
				if (parts.length == searchParts.length + 1
					|| (parts.length == searchParts.length + 2 && parts[searchParts.length] == "jobs") // exception for jobs
					|| (parts.length == searchParts.length + 2 && parts[searchParts.length] == "admin") // exception for jobs
					|| (parts.length > searchParts.length && parts[searchParts.length].startsWith("{"))) {
					for (let m of Object.getOwnPropertyNames(FabricAPICompletionProvider.swagger.paths[item])) {
						let itemToAdd = { ...FabricAPICompletionProvider.swagger.paths[item][m] };
						if (m && m == method) {
							itemToAdd.path = item;
							itemToAdd.sortText = item;

							if (!method) {
								itemToAdd.methodOverwrite = m;
							}
							matches.push(itemToAdd);
						}
						else {
							itemToAdd.path = item;
							itemToAdd.sortText = 'ZZZ' + item;
							itemToAdd.methodOverwrite = m;
							matchesDifferentMethod.push(itemToAdd);
						}
					}
				}
				else if (parts.length > searchParts.length + 1) {
					for (let m of Object.getOwnPropertyNames(FabricAPICompletionProvider.swagger.paths[item])) {
						let itemShort = parts.slice(0, searchParts.length + 1).join("/");
						let itemToAdd: ApiEndpointDetails = {
							path: itemShort
						};

						if (m && m == method) {
							itemToAdd.sortText = itemShort;

							if (!method) {
								itemToAdd.methodOverwrite = m;
							}
							matches.push(itemToAdd);
						}
					}
				}
			}
		}
		ThisExtension.Logger.logDebug(`Found ${matches.length} direct matches and ${matchesDifferentMethod.length} indirect matches!`);

		return matches.concat(matchesDifferentMethod);
	}

	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
		if (context.triggerCharacter == "%" && position.line == 0 && position.character == 1) {
			let apiMagic: vscode.CompletionItem = {
				label: "API",
				insertText: "api",
				commitCharacters: [" "],
				detail: "Power BI REST API",
				documentation: "Execute arbitrary Power BI REST API calls"
			};

			let cmdMagic: vscode.CompletionItem = {
				label: "CMD",
				insertText: "cmd",
				commitCharacters: [" "],
				detail: "Notebook Commands",
				documentation: "Set variables in the current notebook",
			};

			let graphQLMagic: vscode.CompletionItem = {
				label: "GraphQL",
				insertText: "grapql",
				commitCharacters: [" "],
				detail: "GraphQL Query",
				documentation: "Run a GraphQL query against the current endpoint.",
			};

			return [apiMagic, cmdMagic, graphQLMagic];
		}
		else if (context.triggerCharacter == ".") {
			// starting with . for relative path 
			// lookup for api root path of current document
			// this kicks in anyway when the user types the next '/'
		}
		else if (context.triggerCharacter == " ") {
			// starting with ' ' after specifying the method
			// lookup only show valid endpoints
		}
		else if (context.triggerCharacter == "/") {
			try {
				ThisExtension.Logger.logDebug("CompletionProvider started!");
				let currentLine = document.lineAt(position.line).text;
				let method = currentLine.split(" ")[0];
				let showOtherMethods = true; // for future use to also display other Methods and overwrite it then
				if (method.startsWith('%')) { //when overwriting the API for a specific magic, we only show GET methods
					method = 'GET';
					showOtherMethods = false;
				}
				let currentPath = currentLine.split(" ")[1];

				if (currentPath.startsWith('./')) {
					const nbContext = FabricNotebookContext.getForUri(document.uri);
					currentPath = Helper.joinPath(nbContext.apiRootPath, currentPath.slice(2));
				}

				if (currentPath.startsWith('./')) {
					const nbContext = FabricNotebookContext.getForUri(document.uri);
					currentPath = Helper.joinPath('/v1', nbContext.apiRootPath, currentPath.slice(2));
				}
				else if (currentPath.startsWith('/') && !currentPath.startsWith('/v1')) {
					currentPath = Helper.joinPath('/v1', currentPath);
				}

				// replace multiple slashes with one
				currentPath = currentPath.replace(/\/+/gm, "/");

				// replace guids with placeholders from previous path
				let pathSearch = currentPath.replace(/\/([a-zA-Z]*?)\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/gm, "/$1/{$1XXXId}").replace(new RegExp("sXXX", "g"), "");

				let matchingApis = await this.getAvailableEndpoints(pathSearch, method, showOtherMethods);
				let completionItems: vscode.CompletionItem[] = [];

				for (let api of matchingApis) {
					const nextToken = Helper.trimChar(api.path.slice(pathSearch.length), "/", true).split("/")[0];
					let insertText = nextToken;

					// placeholder for ID of resource
					if (nextToken.startsWith("{") && nextToken.endsWith("}")) {
						ThisExtension.Logger.logDebug("Found a placeholder: " + nextToken + " - getting available values from API ...");
						const itemType = nextToken.slice(1, nextToken.length - 1);

						const items = await FabricApiService.getList<iFabricApiItem>(currentPath);
						for (let item of items.success) {
							completionItems.push(await this.getCompletionItem(itemType, item));
						}
						break;
					}

					let completionItem: vscode.CompletionItem = {
						label: nextToken,
						insertText: insertText,
						commitCharacters: TRIGGER_CHARS,
						detail: api.summary,
						documentation: new vscode.MarkdownString(api.description),
						sortText: api.sortText,
					};

					if (api.methodOverwrite) {
						completionItem.label = api.methodOverwrite.toUpperCase() + " " + completionItem.label;
						completionItem.additionalTextEdits = [vscode.TextEdit.replace(new vscode.Range(position.line, 0, position.line, method.length), api.methodOverwrite.toUpperCase())];
					}

					if (!completionItems.find((item) => item.label == completionItem.label) && nextToken != "/" && nextToken != "") {
						ThisExtension.Logger.logDebug("Adding '" + nextToken + "' to completion list! (from '" + api.path + "')");
						completionItems.push(completionItem);
					}

					if (api.parameters && this.showExamples(api.path, currentPath)) {
						let bodyParameter = api.parameters?.find((p) => p.in == "body");
						if (bodyParameter) {
							let examples = Object.getOwnPropertyNames(api["x-ms-examples"]);
							for (let example of examples) {
								try {
									const exampleDef = api["x-ms-examples"][example];
									// check if the example has a $ref property, which means it is not a valid example
									// and should be skipped
									if (exampleDef.$ref) {
										ThisExtension.Logger.logDebug("Skipping example '" + example + "' as it is not a valid example!");
										continue;
									}
									let exampleInsertText = insertText;
									let exampleBody = {}
									let exampleQueryParameters = {}
									for (const param of Object.getOwnPropertyNames(exampleDef.parameters)) {
										const origParam = api.parameters.find((p) => p.name == param);
										if (origParam.in == "body") {
											exampleBody = exampleDef.parameters[param];
										}
										if (origParam.in == "query" && !exampleInsertText.includes(param + "=")) {
											exampleQueryParameters[param] = exampleDef.parameters[param];
										}
									}

									if (exampleQueryParameters && Object.keys(exampleQueryParameters).length > 0) {
										exampleInsertText = exampleInsertText + "?" + Object.keys(exampleQueryParameters).map(key => `${key}=${exampleQueryParameters[key]}`).join("&");
									}

									let completionItem: vscode.CompletionItem = {
										label: nextToken + ": " + example,
										kind: vscode.CompletionItemKind.Snippet,
										insertText: exampleInsertText + "\n" + JSON.stringify(exampleBody, null, 4),
										commitCharacters: TRIGGER_CHARS,
										detail: example
									};

									if (api.methodOverwrite) {
										completionItem.label = api.methodOverwrite.toUpperCase() + " " + completionItem.label;
										completionItem.additionalTextEdits = [vscode.TextEdit.replace(new vscode.Range(position.line, 0, position.line, method.length), api.methodOverwrite.toUpperCase())];
									}

									completionItems.push(completionItem);
								}
								catch (error) {
									ThisExtension.Logger.logDebug("Error while processing example '" + example + "': " + error);
								}
							}
						}
					}
				}
				ThisExtension.Logger.logInfo("Found " + completionItems.length + " completions! (filtered duplicates)");

				if (completionItems.length == 0) {
					completionItems.push({
						label: "No completion items found!",
						insertText: ""
					})
				}
				return completionItems;
			}
			catch (error) {
				ThisExtension.Logger.logError("ERROR: " + error);
			}
		}

		return [];
	}

	resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return undefined;
	}

	async getCompletionItem(itemType: string, apiItem: any): Promise<vscode.CompletionItem> {
		let completionItem = new vscode.CompletionItem("Dummy", vscode.CompletionItemKind.Reference);

		// take the overwritten itemtype or ### which will be later replaced via ??
		const itemTypeOverwrite = LIST_ITEM_OVERWRITE[itemType] ?? "###";

		completionItem.label = apiItem.name ?? apiItem.displayName ?? apiItem[itemTypeOverwrite];
		completionItem.detail = await this.getCompletionItemDetail(apiItem)
		completionItem.insertText = apiItem[itemTypeOverwrite] ?? apiItem.id,
			completionItem.commitCharacters = TRIGGER_CHARS;

		return completionItem;
	}

	async getCompletionItemDetail(apiItem: any): Promise<string> {
		let details = {};
		for (let property of Object.getOwnPropertyNames(apiItem)) {
			if (DETAILS_BLACKLIST.includes(property) || !apiItem[property] || apiItem[property].toString().length > 100) {
				continue
			}
			details[property] = apiItem[property];
		}

		return JSON.stringify(details, null, 4);
	}

	showExamples(apiPath: string, currentPath: string): boolean {
		// remove placeholders from apiPath
		apiPath = apiPath.split("/").slice(0, -1).join("/");
		apiPath = apiPath.replace(/{[a-zA-Z]*?}/g, ".*?");
		// remove placeholders from currentPath
		//currentPath = currentPath.replace(/\/[a-zA-Z0-9]*?\//g, "/XXX/");

		return new RegExp(apiPath).test(currentPath);
	}
}