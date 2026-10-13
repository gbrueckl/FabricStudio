import * as vscode from 'vscode';
import { stringifyRefs, PreserveType } from 'json-serialize-refs';
import { ThisExtension } from '../../ThisExtension';
import { FabricAPICompletionProvider } from '../language/FabricAPICompletionProvider';

const REPOSITORY_URL = 'https://api.github.com/repos/microsoft/fabric-rest-api-specs/git/trees/main?recursive=1';
const CONTENT_URL = 'https://raw.githubusercontent.com/microsoft/fabric-rest-api-specs/main/';
const OUTPUT_FILE_NAME = 'swagger.json';
const PATH_ITEM_OPERATION_KEYS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch']);
const LAST_UPDATED_KEY = 'apiSpecificationLastUpdated';
const DOWNLOAD_BATCH_SIZE = 10;
const UPDATE_INTERVAL_SETTING = 'apiSpecificationUpdateIntervalDays';

type SwaggerDocument = Record<string, any>;

interface GitTreeResponse {
	tree?: Array<{ path: string; type: string }>;
}

/** Downloads, combines, and publishes the Fabric REST API specifications. */
export class FabricApiSpecificationUpdater {
	/** Starts an update when the extension changed or the configured update interval elapsed. */
	public static updateIfDue(context: vscode.ExtensionContext, extensionWasUpdated: boolean = false): void {
		const lastUpdated = context.globalState.get<number>(LAST_UPDATED_KEY);
		// AIDEV-NOTE: Keep the default in sync with the package.json setting declaration.
		const updateIntervalMs = vscode.workspace.getConfiguration('fabricStudio').get<number>(UPDATE_INTERVAL_SETTING, 7) * 24 * 60 * 60 * 1000;
		if (extensionWasUpdated || typeof lastUpdated !== 'number' || Date.now() - lastUpdated > updateIntervalMs) {
			// AIDEV-NOTE: Failed updates leave the timestamp unchanged so activation retries on the next start.
			void vscode.commands.executeCommand('FabricStudio.updateApiSpecification');
		}
	}

	/**
	 * Updates the installed extension's Swagger definition without creating local temporary files.
	 */
	public static async update(extensionUri: vscode.Uri): Promise<SwaggerDocument> {
		const outputUri = vscode.Uri.joinPath(extensionUri, 'resources', 'API', OUTPUT_FILE_NAME);
		ThisExtension.Logger.logInfo('Downloading Fabric API specifications ...');
		const jsonFiles = await this.getJsonFiles();
		const sourceFiles = jsonFiles.filter(file => !/(^|\/)examples(\/|$)/i.test(file));
		const documents = await this.downloadDocuments(sourceFiles);
		await this.downloadReferencedDocuments(documents, new Map(jsonFiles.map(file => [file.toLowerCase(), file])));
		ThisExtension.Logger.logInfo(`Combining ${sourceFiles.length} Fabric API specification files ...`);
		const outputContent = await this.createOutputContent(this.combineDocuments(documents, sourceFiles));

		// AIDEV-NOTE: Keep the temporary file beside the target so workspace.fs.rename is atomic where supported.
		const temporaryUri = vscode.Uri.joinPath(outputUri.with({ path: outputUri.path.substring(0, outputUri.path.lastIndexOf('/')) }), `.${OUTPUT_FILE_NAME}-${Date.now()}.tmp`);
		try {
			await vscode.workspace.fs.writeFile(temporaryUri, new TextEncoder().encode(outputContent));
			await vscode.workspace.fs.rename(temporaryUri, outputUri, { overwrite: true });
			ThisExtension.Logger.logInfo('Fabric API specification updated successfully.');
		}
		finally {
			try {
				await vscode.workspace.fs.delete(temporaryUri);
			}
			catch {
				// The rename normally removes the temporary file.
			}
		}

		return JSON.parse(outputContent) as SwaggerDocument;
	}

	/** Updates the specification and informs the user of the result. */
	public static async updateAndNotify(context: vscode.ExtensionContext): Promise<boolean> {
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Updating Fabric API specification',
				cancellable: false
			}, () => this.update(context.extensionUri));
			await FabricAPICompletionProvider.reloadSwaggerFile();
			await context.globalState.update(LAST_UPDATED_KEY, Date.now());
			const action = await vscode.window.showInformationMessage('Fabric API specification updated. Reload VS Code to refresh all API tools.', 'Reload Window');
			if (action === 'Reload Window') {
				await vscode.commands.executeCommand('workbench.action.reloadWindow');
			}
			return true;
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ThisExtension.Logger.logError(`Unable to update the Fabric API specification: ${message}`);
			vscode.window.showErrorMessage(`Unable to update the Fabric API specification: ${message}`);
			return false;
		}
	}

	private static async getJsonFiles(): Promise<string[]> {
		const response = await fetch(REPOSITORY_URL);
		if (!response.ok) {
			throw new Error(`Could not list API specifications (HTTP ${response.status} ${response.statusText}).`);
		}

		const tree = await response.json() as GitTreeResponse;
		const files = (tree.tree ?? [])
			.filter(entry => entry.type === 'blob' && entry.path.endsWith('.json'))
			.map(entry => entry.path)
			.sort((left, right) => left.localeCompare(right));
		if (files.length === 0) {
			throw new Error('No JSON files were found in the API specification repository.');
		}
		ThisExtension.Logger.logInfo(`Found ${files.length} API specification and reference files.`);
		return files;
	}

	private static async downloadDocuments(files: string[]): Promise<Map<string, SwaggerDocument>> {
		const documents = new Map<string, SwaggerDocument>();
		for (let index = 0; index < files.length; index += DOWNLOAD_BATCH_SIZE) {
			const batch = files.slice(index, index + DOWNLOAD_BATCH_SIZE);
			const downloadedDocuments = await Promise.all(batch.map(async file => {
				const response = await fetch(`${CONTENT_URL}${file}`);
				if (!response.ok) {
					throw new Error(`Could not download '${file}' (HTTP ${response.status} ${response.statusText}).`);
				}
				return [file, JSON.parse(await response.text()) as SwaggerDocument] as const;
			}));
			for (const [file, document] of downloadedDocuments) {
				documents.set(file, document);
			}
			ThisExtension.Logger.logInfo(`Downloaded ${documents.size} of ${files.length} API specification files.`);
		}
		return documents;
	}

	private static async downloadReferencedDocuments(documents: Map<string, SwaggerDocument>, availableFiles: Map<string, string>): Promise<void> {
		let documentsToInspect = new Map(documents);
		while (documentsToInspect.size > 0) {
			const referencedFiles = new Set<string>();
			for (const [file, document] of documentsToInspect) {
				this.collectReferencedFiles(document, file, referencedFiles);
			}
			const missingFiles = Array.from(referencedFiles)
				.map(file => availableFiles.get(file.toLowerCase()))
				.filter((file): file is string => file !== undefined && !this.hasDocument(documents, file));
			if (missingFiles.length === 0) {
				return;
			}
			ThisExtension.Logger.logInfo(`Downloading ${missingFiles.length} referenced API specification files ...`);
			documentsToInspect = await this.downloadDocuments(missingFiles);
			for (const [file, document] of documentsToInspect) {
				documents.set(file, document);
			}
		}
	}

	private static collectReferencedFiles(value: any, sourceFile: string, referencedFiles: Set<string>): void {
		if (value === null || typeof value !== 'object') {
			return;
		}
		if (typeof value.$ref === 'string') {
			const [referenceFile] = value.$ref.split('#', 2);
			if (referenceFile) {
				referencedFiles.add(this.resolveFilePath(sourceFile, referenceFile));
			}
		}
		for (const childValue of Object.values(value)) {
			this.collectReferencedFiles(childValue, sourceFile, referencedFiles);
		}
	}

	private static hasDocument(documents: Map<string, SwaggerDocument>, file: string): boolean {
		return documents.has(file) || Array.from(documents.keys()).some(documentFile => documentFile.toLowerCase() === file.toLowerCase());
	}

	private static combineDocuments(documents: Map<string, SwaggerDocument>, files: string[]): SwaggerDocument {
		const firstDocument = documents.get(files[0]);
		const resolvedDocuments = new Map<string, SwaggerDocument>();
		const activeValues = new WeakMap<object, any>();

		const resolveValue = (value: any, sourceFile: string): any => {
			if (value === null || typeof value !== 'object') {
				return value;
			}
			const existingValue = activeValues.get(value);
			if (existingValue) {
				return existingValue;
			}
			if ('$ref' in value && typeof value.$ref === 'string') {
				const [referenceFile, pointer = ''] = value.$ref.split('#', 2);
				const targetFile = referenceFile ? this.resolveFilePath(sourceFile, referenceFile) : sourceFile;
				const targetDocument = documents.get(targetFile)
					?? Array.from(documents.entries()).find(([file]) => file.toLowerCase() === targetFile.toLowerCase())?.[1];
				if (!targetDocument) {
					throw new Error(`Reference '${value.$ref}' in '${sourceFile}' could not be resolved.`);
				}
				const referencePlaceholder: SwaggerDocument = {};
				activeValues.set(value, referencePlaceholder);
				try {
					return resolveValue(this.resolveJsonPointer(targetDocument, pointer, value.$ref), targetFile);
				}
				finally {
					activeValues.delete(value);
				}
			}
			const result: any = Array.isArray(value) ? [] : {};
			activeValues.set(value, result);
			try {
				for (const [key, childValue] of Object.entries(value)) {
					result[key] = resolveValue(childValue, sourceFile);
				}
			}
			finally {
				activeValues.delete(value);
			}
			return result;
		};

		for (const file of files) {
			const document = documents.get(file) as SwaggerDocument;
			if (document.swagger !== '2.0') {
				throw new Error(`'${file}' does not contain a Swagger 2.0 definition.`);
			}
			resolvedDocuments.set(file, resolveValue(document, file));
		}

		const combinedDocument: SwaggerDocument = {
			...firstDocument,
			paths: {},
			definitions: {},
			parameters: {},
			responses: {},
			securityDefinitions: {}
		};
		for (const file of files) {
			const document = resolvedDocuments.get(file) as SwaggerDocument;
			const basePath = document.basePath ?? '';
			for (const [apiPath, pathItem] of Object.entries(document.paths ?? {})) {
				const fullPath = `${basePath}${apiPath}`;
				if (!(fullPath in combinedDocument.paths)) {
					combinedDocument.paths[fullPath] = pathItem;
				}
				else {
					this.mergePathItem(combinedDocument.paths[fullPath], pathItem as SwaggerDocument, fullPath, file);
				}
			}
			this.mergeMap(combinedDocument.definitions, document.definitions, 'definition', file);
			this.mergeMap(combinedDocument.parameters, document.parameters, 'parameter', file);
			this.mergeMap(combinedDocument.responses, document.responses, 'response', file);
			this.mergeMap(combinedDocument.securityDefinitions, document.securityDefinitions, 'security definition', file);
		}
		delete combinedDocument.basePath;
		delete combinedDocument.host;
		delete combinedDocument.schemes;
		return combinedDocument;
	}

	private static resolveFilePath(sourceFile: string, referenceFile: string): string {
		const parts = [...sourceFile.split('/').slice(0, -1), ...referenceFile.split('/')];
		return parts.reduce((resolved: string[], part) => {
			if (part === '' || part === '.') {
				return resolved;
			}
			if (part === '..') {
				resolved.pop();
			}
			else {
				resolved.push(part);
			}
			return resolved;
		}, []).join('/');
	}

	private static resolveJsonPointer(document: SwaggerDocument, pointer: string, reference: string): any {
		return pointer.split('/').slice(1).reduce((value, segment) => {
			const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
			if (value === undefined || !(key in value)) {
				throw new Error(`Reference '${reference}' could not be resolved.`);
			}
			return value[key];
		}, document);
	}

	private static mergeMap(target: SwaggerDocument, source: SwaggerDocument | undefined, property: string, sourceFile: string): void {
		for (const [key, value] of Object.entries(source ?? {})) {
			if (key in target && this.serialise(target[key]) !== this.serialise(value)) {
				ThisExtension.Logger.logWarning(`Conflicting ${property} entry '${key}' in ${sourceFile}; replacing the earlier entry.`);
			}
			target[key] = value;
		}
	}

	private static mergePathItem(target: SwaggerDocument, source: SwaggerDocument, apiPath: string, sourceFile: string): void {
		for (const [key, value] of Object.entries(source)) {
			if (!(key in target)) {
				target[key] = value;
			}
			else if (key === 'parameters') {
				target.parameters = this.mergeParameters(target.parameters ?? [], value as any[], apiPath, sourceFile);
			}
			else if (this.serialise(target[key]) !== this.serialise(value)) {
				const property = PATH_ITEM_OPERATION_KEYS.has(key) ? `operation '${key.toUpperCase()}'` : `Path Item property '${key}'`;
				ThisExtension.Logger.logWarning(`Conflicting ${property} on '${apiPath}' in ${sourceFile}; replacing the earlier entry.`);
				target[key] = value;
			}
		}
	}

	private static mergeParameters(target: any[], source: any[], apiPath: string, sourceFile: string): any[] {
		const parameters = [...target];
		for (const sourceParameter of source) {
			const index = parameters.findIndex(parameter => parameter.in === sourceParameter.in && parameter.name === sourceParameter.name);
			if (index < 0) {
				parameters.push(sourceParameter);
			}
			else if (this.serialise(parameters[index]) !== this.serialise(sourceParameter)) {
				ThisExtension.Logger.logWarning(`Conflicting parameter '${sourceParameter.in}:${sourceParameter.name}' on '${apiPath}' in ${sourceFile}; replacing the earlier entry.`);
				parameters[index] = sourceParameter;
			}
		}
		return parameters;
	}

	private static serialise(value: any): string {
		return stringifyRefs(value, null, 0, PreserveType.Objects);
	}

	private static async createOutputContent(document: SwaggerDocument): Promise<string> {
		const serialisedDocument = stringifyRefs(document, null, 4, PreserveType.Objects);
		const outputDocument = this.sort(this.removeReferenceMetadata(JSON.parse(serialisedDocument)));
		this.validateOutputDocument(outputDocument);
		const outputContent = JSON.stringify(outputDocument, null, 4);
		return `${outputContent}\n`;
	}

	private static validateOutputDocument(document: SwaggerDocument): void {
		if (document.swagger !== '2.0' || !document.info || typeof document.paths !== 'object') {
			throw new Error('The combined API definition is not a valid Swagger 2.0 document.');
		}
	}

	private static removeReferenceMetadata(value: any): any {
		if (Array.isArray(value)) {
			return value.map(item => this.removeReferenceMetadata(item));
		}
		if (value === null || typeof value !== 'object') {
			return value;
		}
		return Object.entries(value).reduce((result: SwaggerDocument, [key, childValue]) => {
			if (key !== '$id' && key !== '$ref') {
				result[key] = this.removeReferenceMetadata(childValue);
			}
			return result;
		}, {});
	}

	private static sort(value: any): any {
		if (value === null || value === undefined || typeof value !== 'object') {
			return value;
		}
		if (Array.isArray(value)) {
			return value.map(item => this.sort(item));
		}
		return Object.keys(value).sort().reduce((sorted: SwaggerDocument, key) => {
			sorted[key] = this.sort(value[key]);
			return sorted;
		}, {});
	}
}
