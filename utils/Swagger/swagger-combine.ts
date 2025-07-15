import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as url from 'url';

const swaggerCombine = require('swagger-combine');

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

const globPatterns = path.join(definitionDir, "**", "*.json").replace(/\\/g, '/');
console.log(`Glob pattern: ${globPatterns}`);

let jsonFiles = glob.sync(globPatterns);

jsonFiles = jsonFiles.filter(file => !file.includes("\\examples\\"));

let apis = jsonFiles.map(file => {
	return {"url": url.pathToFileURL(file).toString()}; 
});

let config = {
	"swagger": "2.0",
	"info": {
		"title": "Basic Swagger Combine Example",
		"version": "1.0.0"
	},
	"apis": apis
}


swaggerCombine(config)
	.then(res => console.log(JSON.stringify(res)))
	.catch(err => console.error(err));