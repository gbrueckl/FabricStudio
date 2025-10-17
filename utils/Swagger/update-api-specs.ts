import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import AdmZip from 'adm-zip';
import SwaggerParser from "@apidevtools/swagger-parser";
import { stringifyRefs, parseRefs, PreserveType } from "json-serialize-refs";

const REPO_NAME = "fabric-rest-api-specs";
const BRANCH = "main"
const REPOSITORY_URL = `https://github.com/microsoft/${REPO_NAME}`;
const SCRIPT_DIRECTORY = path.resolve(__dirname)
const ZIP_FILE_NAME = `${SCRIPT_DIRECTORY}/FabricRESTAPI.zip`;
const OUTPUT_DIRECTORY = `${SCRIPT_DIRECTORY}/definition`;

const url = `${REPOSITORY_URL}/archive/refs/heads/${BRANCH}.zip`;

function downloadFile(url: string, outputPath: string) {
	return fetch(url)
		.then(x => x.arrayBuffer())
		//.then(x => writeFile(outputPath, Buffer.from(x)));
		.then(x => {fs.writeFileSync(outputPath, Buffer.from(x)); console.log(`File written to ${outputPath}`);})
}

downloadFile(url, ZIP_FILE_NAME)
	.then(() => {
		console.log(`Downloaded ${url} \n\tto ${ZIP_FILE_NAME}`);
	})
	.then(() => {
		console.log('Unzipping files');
		var zip = new AdmZip(ZIP_FILE_NAME);
		const folderName = `${REPO_NAME}-${BRANCH}/`;
		const folderEntry = zip.getEntry(folderName);
		if (!folderEntry) {
			throw new Error(`Folder entry ${folderName} not found in zip`);
		}
		console.log(folderEntry.entryName);
		console.log(`Start unzip of ${REPO_NAME}-${BRANCH}/...`);
		zip.extractEntryTo(folderEntry, OUTPUT_DIRECTORY, /*overwrite*/ true);
		console.log('Finished unzip!');
	})
	.catch(err => {
		console.error(`Error downloading ${url}:`, err);
	});


/*
COMBINE SWAGGER FILES
*/
const definitionDir = path.join(__dirname, 'definition', 'fabric-rest-api-specs-main');
const outputDir = path.join(__dirname, '..', '..', 'resources', 'API');
const outputFile = path.join(outputDir, 'swagger.json');

console.log('Starting swagger file combination...');
console.log(`Definition directory: ${definitionDir}`);
console.log(`Output file: ${outputFile}`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

function sort(obj: any) {
	if (obj === null || obj === undefined)
		return obj;
	if (typeof obj !== "object" || Array.isArray(obj))
		return obj;
	const sortedObject: any = {};
	const keys = Object.keys(obj).sort();
	keys.forEach(key => sortedObject[key] = sort(obj[key]));
	return sortedObject;
}

async function processJsonFile(file: string) {
	console.log(`Processing file: ${file}`);

	let singleJson: any = await SwaggerParser.dereference(file);
	if (!singleJson["swagger"]) {
		throw new Error(`File ${file} does not contain a valid Swagger definition.`);
	}

	let newPaths: Record<string, any> = {};
	for (const path in singleJson.paths) {
		newPaths[singleJson["basePath"] + path] = singleJson.paths[path];
	}
	singleJson.paths = newPaths;

	return singleJson;
}

async function combineJsonFiles(files: string[]) {
	let combinedJson = await processJsonFile(files[0]);

	for (const file of files.slice(1)) {
		try {
			let singleJson = await processJsonFile(file)

			for (const prop of ["paths", "definitions"]) {
				combinedJson[prop] = { ...combinedJson[prop], ...singleJson[prop] };
			}
		}
		catch (error: any) {
			console.error(`Error processing file ${file}: ${error.message}`);
			continue; // Skip this file and continue with the next
		}
	}

	return combinedJson;
}


const globPatterns = path.join(definitionDir, "**", "*.json").replace(/\\/g, '/');
console.log(`Glob pattern: ${globPatterns}`);

let jsonFiles = glob.sync(globPatterns);

jsonFiles = jsonFiles.filter(file => !file.includes("\\examples\\"));

combineJsonFiles(jsonFiles)
	.then(combinedJson => {
		// stringifyRefs removes recursive references
		let outputContent = stringifyRefs(combinedJson, null, 4, PreserveType.Objects);
		outputContent = outputContent.replace(/[\r\n]*.*"\$id":.*,/gm, ''); // Remove $id properties
		outputContent = outputContent.replace(/[\r\n,]*.*"\$id":.*/gm, ''); // Remove $id if last property
		outputContent = outputContent.replace(/[\r\n]*.*"\$ref":.*,/gm, ''); // Remove $ref properties
		outputContent = outputContent.replace(/[\r\n,]*.*"\$ref":.*/gm, ''); // Remove $ref if last property

		let outputObject = JSON.parse(outputContent);
		outputObject = sort(outputObject);

		outputContent = JSON.stringify(outputObject, null, 4);

		fs.writeFileSync(outputFile, outputContent, 'utf8');
		console.log(`Combined JSON written to ${outputFile}`);
	})
	.catch(error => console.error(`Error combining JSON files: ${error.message}`));