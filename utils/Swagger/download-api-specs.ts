const path = require('path')
const fs = require('fs')
const admZip = require('adm-zip');

const REPO_NAME = "fabric-rest-api-specs";
const BRANCH = "main"
const REPOSITORY_URL = `https://github.com/microsoft/${REPO_NAME}`;
const SCRIPT_DIRECTORY = path.resolve(__dirname)
const ZIP_FILE_NAME = `${SCRIPT_DIRECTORY}/FabricRESTAPI.zip`;
const OUTPUT_DIRECTORY = `${SCRIPT_DIRECTORY}/definition`;

const url = `${REPOSITORY_URL}/archive/refs/heads/${BRANCH}.zip`;

function downloadFile(url, outputPath) {
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
		var zip = new admZip(ZIP_FILE_NAME);
		const folderName = `${REPO_NAME}-${BRANCH}/`;
		const folderEntry = zip.getEntry(folderName);
		console.log(folderEntry.entryName);
		console.log(`Start unzip of ${REPO_NAME}-${BRANCH}/...`);
		zip.extractEntryTo(folderEntry, OUTPUT_DIRECTORY, /*overwrite*/ true);
		console.log('Finished unzip!');
	})
	.catch(err => {
		console.error(`Error downloading ${url}:`, err);
	});