import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import SwaggerParser from "@apidevtools/swagger-parser";
import { stringifyRefs, parseRefs, PreserveType } from "json-serialize-refs";




const definitionDir = path.join(__dirname, 'definition');
const outputDir = path.join(__dirname, '..', '..', 'resources', 'API');
const outputFile = path.join(outputDir, 'swagger.json');

console.log('Starting swagger file combination...');
console.log(`Definition directory: ${definitionDir}`);
console.log(`Output file: ${outputFile}`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

async function processJsonFile(file: string) {
	console.log(`Processing file: ${file}`);

	let singleJson = await SwaggerParser.dereference(file);
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
		catch (error) {
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
		let outputContent = stringifyRefs(combinedJson, null, 4, PreserveType.Objects);
		outputContent = outputContent.replace(/[\r\n]*.*"\$id":.*,/gm, ''); // Remove $id properties
		outputContent = outputContent.replace(/[\r\n,]*.*"\$id":.*/gm, ''); // Remove $id if last property
		fs.writeFileSync(outputFile, outputContent, 'utf8');
		console.log(`Combined JSON written to ${outputFile}`);
	})
	.catch(error => console.error(`Error combining JSON files: ${error.message}`));