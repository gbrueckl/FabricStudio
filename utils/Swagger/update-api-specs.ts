import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as glob from 'glob';
import AdmZip from 'adm-zip';
import SwaggerParser from '@apidevtools/swagger-parser';
import { stringifyRefs, PreserveType } from 'json-serialize-refs';

const REPO_NAME = 'fabric-rest-api-specs';
const BRANCH = 'main';
const REPOSITORY_URL = `https://github.com/microsoft/${REPO_NAME}`;
const SCRIPT_DIRECTORY = path.resolve(__dirname);
const OUTPUT_DIRECTORY = path.join(SCRIPT_DIRECTORY, '..', '..', 'resources', 'API');
const OUTPUT_FILE = path.join(OUTPUT_DIRECTORY, 'swagger.json');
const DOWNLOAD_URL = `${REPOSITORY_URL}/archive/refs/heads/${BRANCH}.zip`;

type SwaggerDocument = Record<string, any>;

// AIDEV-API-SPECS-UPDATE: This workflow must stay sequential. Publishing is only allowed after download, extraction, combination, and validation all succeed.
async function downloadFile(url: string, outputPath: string): Promise<void> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Download failed with HTTP ${response.status} ${response.statusText}.`);
	}

	fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
	console.log(`Downloaded ${url} to ${outputPath}`);
}

function extractArchive(zipPath: string, extractionDirectory: string): string {
	const zip = new AdmZip(zipPath);
	const rootDirectories = new Set(
		zip.getEntries()
			.map(entry => entry.entryName.split('/')[0])
			.filter(Boolean)
	);

	if (rootDirectories.size !== 1) {
		throw new Error(`Expected one root directory in the downloaded archive, found: ${Array.from(rootDirectories).join(', ') || 'none'}.`);
	}

	fs.mkdirSync(extractionDirectory, { recursive: true });
	zip.extractAllTo(extractionDirectory, true);

	const definitionDirectory = path.resolve(extractionDirectory, Array.from(rootDirectories)[0]);
	if (path.relative(extractionDirectory, definitionDirectory).startsWith('..') || !fs.existsSync(definitionDirectory)) {
		throw new Error('The extracted API definition directory is invalid.');
	}

	console.log(`Extracted API definitions to ${definitionDirectory}`);
	return definitionDirectory;
}

function sort(value: any): any {
	if (value === null || value === undefined || typeof value !== 'object') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sort);
	}

	return Object.keys(value)
		.sort()
		.reduce((sorted: Record<string, any>, key) => {
			sorted[key] = sort(value[key]);
			return sorted;
		}, {});
}

async function processJsonFile(file: string): Promise<SwaggerDocument> {
	console.log(`Processing file: ${file}`);
	const document = await SwaggerParser.dereference(file) as SwaggerDocument;
	if (document.swagger !== '2.0') {
		throw new Error('File does not contain a Swagger 2.0 definition.');
	}

	const basePath = document.basePath ?? '';
	document.paths = Object.entries(document.paths ?? {}).reduce((paths: Record<string, any>, [apiPath, value]) => {
		paths[`${basePath}${apiPath}`] = value;
		return paths;
	}, {});

	return document;
}

function serialiseForComparison(value: any): string {
	return stringifyRefs(value, null, 0, PreserveType.Objects);
}

function mergeMap(target: Record<string, any>, source: Record<string, any> | undefined, property: string, sourceFile: string): void {
	for (const [key, value] of Object.entries(source ?? {})) {
		if (key in target) {
			if (serialiseForComparison(target[key]) !== serialiseForComparison(value)) {
				console.warn(`Conflicting ${property} entry '${key}' in ${sourceFile}; replacing the earlier entry using sorted source order.`);
			}
		}
		target[key] = value;
	}
}

const PATH_ITEM_OPERATION_KEYS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch']);

function mergePathParameters(targetParameters: any[], sourceParameters: any[], apiPath: string, sourceFile: string): any[] {
	const parameters = [...targetParameters];
	for (const sourceParameter of sourceParameters) {
		const matchingIndex = parameters.findIndex(parameter => parameter.in === sourceParameter.in && parameter.name === sourceParameter.name);
		if (matchingIndex === -1) {
			parameters.push(sourceParameter);
			continue;
		}
		if (serialiseForComparison(parameters[matchingIndex]) !== serialiseForComparison(sourceParameter)) {
			console.warn(`Conflicting parameter '${sourceParameter.in}:${sourceParameter.name}' on path '${apiPath}' in ${sourceFile}; replacing the earlier parameter using sorted source order.`);
			parameters[matchingIndex] = sourceParameter;
		}
	}
	return parameters;
}

// AIDEV-SWAGGER-PATH-MERGE: A Path Item can receive different HTTP operations from multiple source files; retain each operation instead of replacing the whole path.
export function mergePathItems(targetPathItem: Record<string, any>, sourcePathItem: Record<string, any>, apiPath: string, sourceFile: string): void {
	for (const [key, value] of Object.entries(sourcePathItem)) {
		if (!(key in targetPathItem)) {
			targetPathItem[key] = value;
			continue;
		}

		if (key === 'parameters') {
			targetPathItem.parameters = mergePathParameters(targetPathItem.parameters ?? [], value as any[], apiPath, sourceFile);
			continue;
		}

		if (serialiseForComparison(targetPathItem[key]) === serialiseForComparison(value)) {
			continue;
		}

		const propertyType = PATH_ITEM_OPERATION_KEYS.has(key) ? 'operation' : 'Path Item property';
		console.warn(`Conflicting ${propertyType} '${key.toUpperCase()}' on path '${apiPath}' in ${sourceFile}; replacing the earlier value using sorted source order.`);
		targetPathItem[key] = value;
	}
}

function mergePaths(targetPaths: Record<string, any>, sourcePaths: Record<string, any> | undefined, sourceFile: string): void {
	for (const [apiPath, sourcePathItem] of Object.entries(sourcePaths ?? {})) {
		if (!(apiPath in targetPaths)) {
			targetPaths[apiPath] = sourcePathItem;
			continue;
		}
		mergePathItems(targetPaths[apiPath], sourcePathItem as Record<string, any>, apiPath, sourceFile);
	}
}

async function combineJsonFiles(files: string[]): Promise<SwaggerDocument> {
	if (files.length === 0) {
		throw new Error('No Swagger JSON files were found after extraction.');
	}

	const firstFile = files[0];
	const firstDocument = await processJsonFile(firstFile);
	const combinedDocument: SwaggerDocument = {
		...firstDocument,
		paths: {},
		definitions: {},
		parameters: {},
		responses: {},
		securityDefinitions: {}
	};

	for (const file of files) {
		const document = file === firstFile ? firstDocument : await processJsonFile(file);
		mergePaths(combinedDocument.paths, document.paths, file);
		mergeMap(combinedDocument.definitions, document.definitions, 'definition', file);
		mergeMap(combinedDocument.parameters, document.parameters, 'parameter', file);
		mergeMap(combinedDocument.responses, document.responses, 'response', file);
		mergeMap(combinedDocument.securityDefinitions, document.securityDefinitions, 'security definition', file);
	}

	delete combinedDocument.basePath;
	delete combinedDocument.host;
	delete combinedDocument.schemes;
	return combinedDocument;
}

function removeReferenceMetadata(value: any): any {
	if (Array.isArray(value)) {
		return value.map(removeReferenceMetadata);
	}
	if (value === null || typeof value !== 'object') {
		return value;
	}

	return Object.entries(value).reduce((result: Record<string, any>, [key, childValue]) => {
		if (key !== '$id' && key !== '$ref') {
			result[key] = removeReferenceMetadata(childValue);
		}
		return result;
	}, {});
}

async function createOutputContent(combinedDocument: SwaggerDocument): Promise<string> {
	const serialisedDocument = stringifyRefs(combinedDocument, null, 4, PreserveType.Objects);
	const outputDocument = sort(removeReferenceMetadata(JSON.parse(serialisedDocument)));
	const outputContent = JSON.stringify(outputDocument, null, 4);
	JSON.parse(outputContent);

	try {
		await SwaggerParser.validate(outputDocument);
	}
	catch (error) {
		console.warn(`Combined Swagger document is not Swagger 2.0-compatible and will still be published as valid JSON: ${error instanceof Error ? error.message : error}`);
	}

	return `${outputContent}\n`;
}

function publishAtomically(content: string): void {
	fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
	const temporaryOutputFile = path.join(OUTPUT_DIRECTORY, `.swagger-${process.pid}-${Date.now()}.json`);

	try {
		fs.writeFileSync(temporaryOutputFile, content, 'utf8');
		fs.renameSync(temporaryOutputFile, OUTPUT_FILE);
		console.log(`Combined JSON written to ${OUTPUT_FILE}`);
	}
	finally {
		if (fs.existsSync(temporaryOutputFile)) {
			fs.unlinkSync(temporaryOutputFile);
		}
	}
}

function removeDirectory(directory: string): void {
	const fsWithModernRemoval = fs as typeof fs & {
		rmSync?: (path: fs.PathLike, options: { recursive: boolean; force: boolean }) => void;
	};

	if (fsWithModernRemoval.rmSync) {
		fsWithModernRemoval.rmSync(directory, { recursive: true, force: true });
		return;
	}

	fs.rmdirSync(directory, { recursive: true });
}

export async function updateApiSpecs(): Promise<void> {
	const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fabricstudio-api-specs-'));

	try {
		const zipPath = path.join(workingDirectory, `${REPO_NAME}.zip`);
		const extractionDirectory = path.join(workingDirectory, 'definition');
		await downloadFile(DOWNLOAD_URL, zipPath);
		const definitionDirectory = extractArchive(zipPath, extractionDirectory);
		const jsonFiles = glob.sync('**/*.json', { cwd: definitionDirectory, nodir: true })
			.map(file => path.join(definitionDirectory, file))
			.filter(file => !/[\\/]examples[\\/]/i.test(file))
			.sort((left, right) => left.localeCompare(right));

		console.log(`Combining ${jsonFiles.length} Swagger files from ${definitionDirectory}.`);
		const outputContent = await createOutputContent(await combineJsonFiles(jsonFiles));
		publishAtomically(outputContent);
	}
	finally {
		removeDirectory(workingDirectory);
	}
}

if (require.main === module) {
	void updateApiSpecs().catch(error => {
		console.error(`Error updating API specifications: ${error instanceof Error ? error.message : error}`);
		process.exitCode = 1;
	});
}
