import * as vscode from 'vscode';
import { ThisExtension } from '../../../ThisExtension';
import { FabricSparkNotebook, FabricSparkNotebookCell } from './FabricSparkNotebook';
import { SparkLanguageConfig, SparkLanguageConfigs, SparkNotebookLanguage, SparkNotebookMagic } from './_types';

export class FabricSparkNotebookSerializer implements vscode.NotebookSerializer {
	public readonly label: string = 'Fabric Spark Notebook Serializer';

	// language-indepenent header (without comment-characters)
	private readonly HEADER_SUFFIX: string = `Fabric notebook source`;
	private readonly MAGIC_PREFIX: string = `MAGIC`; // cells with magic start with e.g. # MAGIC
	private readonly META_PREFIX: string = "META"; // metadata lines start with e.g. # META
	private readonly CODE_CELL_SUFFIX: string = "CELL"; // for code-cells
	private readonly METADATA_CELL_SUFFIX: string = "METADATA"; // additional metadata for code-cells. Follows directly after the code-cell
	private readonly MARKDOWN_CELL_SUFFIX: string = "MARKDOWN";
	private readonly CELL_SEPARATOR_ASTERIXES: string = "********************";

	public async deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): Promise<FabricSparkNotebook> {
		var contents = Buffer.from(data).toString();
		contents = contents.replace(/\r/gm, ""); // remove any carriage returns

		var firstLineWithCode: number = 1;
		const lines: string[] = contents.trimStart().split("\n");
		if (lines.length == 0) {
			ThisExtension.Logger.logWarning("Not a Fabric Spark Notebook source file. Creating new Notebook.", true);
			return { cells: [] };
		}
		if (!lines[0].trimEnd().endsWith(this.HEADER_SUFFIX)) {
			ThisExtension.Logger.logWarning("File is not a valid Fabric Spark Notebook source file.", true);
			//throw new Error("File is not a valid Fabric Spark Notebook source file.");
			firstLineWithCode = 0;
		}

		const commentChars = lines[0].split(" ")[0];

		let notebookLanguage: SparkLanguageConfig = SparkLanguageConfigs.getConfigByMagic("pyspark");
		let cellLanguage: SparkNotebookLanguage = undefined;
		let languages: SparkLanguageConfig[] = SparkLanguageConfigs.getConfigsByCommentchars(commentChars);

		// let notebookLanguage1: DatabricksLanguageMapping = this.LANGUAGE_MAPPING.find(x => x.databricksLanguage == "python");
		// let cellLanguage1: DatabricksLanguageMapping = undefined;
		// let languages1: DatabricksLanguageMapping[] = this.LANGUAGE_MAPPING.filter(x => x.commentCharacters == commentChars);

		if (languages != undefined && languages.length == 1) {
			notebookLanguage = languages[0];
		}
		else {
			// its Python or R which use the same comment-character
			const rAssignments = contents.split("<-").length;
			const pythonAssignments = contents.split("=").length;

			if (rAssignments > pythonAssignments) {
				notebookLanguage = SparkLanguageConfigs.getConfigByMagic("sparkr");
			}
			// else its Python which is the default anyway
		}
		let notebook: FabricSparkNotebook = new FabricSparkNotebook([]);

		const splitRegex = new RegExp(`\n\n${commentChars} (${this.CODE_CELL_SUFFIX}|${this.MARKDOWN_CELL_SUFFIX}) \\*{20}\n\n`, "gm");

		let rawCells: string[] = lines.slice(firstLineWithCode).join("\n").split(splitRegex);

		let notebookMeta = rawCells[0].split("\n").slice(2).join("\n");
		notebookMeta = notebookMeta.replace(new RegExp(`^${commentChars} ${this.META_PREFIX}\s*`, "gm"), "").trim();
		let notebookMetadata = JSON.parse(notebookMeta);
		notebook.metadata = notebookMetadata;

		rawCells = rawCells.slice(1); // first entry is always empty because of the leading separator
		let cellNum = 0;
		let cell: FabricSparkNotebookCell;
		while (cellNum < rawCells.length / 2) {
			const cellType = rawCells[cellNum * 2];
			const rawCell = rawCells[cellNum * 2 + 1];

			if (cellType == this.CODE_CELL_SUFFIX) {
				let splitMeta = rawCell.split(new RegExp(`^${commentChars} ${this.METADATA_CELL_SUFFIX} \\*{20}`, "gm"));

				let code = splitMeta[0].trim();
				let meta = splitMeta.length > 1 ? splitMeta[1].trim() : undefined;

				cell = new FabricSparkNotebookCell(vscode.NotebookCellKind.Code, code, notebookLanguage.vscodeLanguage);

				// check for magic
				if (code.startsWith(`${commentChars} ${this.MAGIC_PREFIX}`)) {
					const magicLine = code.split("\n")[0];
					const magic = magicLine.replace(new RegExp(`^${commentChars} ${this.MAGIC_PREFIX} `, "gm"), "").trim();
					cellLanguage = SparkLanguageConfigs.getLanguageByMagic(magic);
					cell.languageId = SparkLanguageConfigs.getConfigByMagic(magic as SparkNotebookMagic).vscodeLanguage;
					cell.metadata = { ...cell.metadata, magic: magic };
					cell.value = code.split("\n").map(line => line.replace(new RegExp(`^${commentChars} ${this.MAGIC_PREFIX} `, "gm"), "")).join("\n");
				}

				// Parse metadata from value
				const lines = meta.split('\n');
				const metaStr = meta.replace(new RegExp(`^${commentChars} ${this.META_PREFIX} `, "gm"), "")
				
				if (metaStr) {
					cell.metadata = { ...cell.metadata, ...JSON.parse(metaStr) };
				}
			}
			else if (cellType == this.MARKDOWN_CELL_SUFFIX) {
				cell = new FabricSparkNotebookCell(vscode.NotebookCellKind.Markup, rawCell, "markdown");
			}

			notebook.cells.push(cell);
			cellNum++;
		}

		return notebook;
	}


	public async serializeNotebook(data: FabricSparkNotebook, token: vscode.CancellationToken): Promise<Uint8Array> {
		let notebook: FabricSparkNotebook = data;

		// Determine notebook language, default to pyspark if not specified
		let notebookLanguage: SparkLanguageConfig = notebook.metadata?.notebookLanguage || SparkLanguageConfigs.getConfigByMagic("pyspark");
		const commentChars = notebookLanguage.commentChar;

		let output = `${commentChars} ${this.HEADER_SUFFIX}\n\n`;

		// Serialize notebook metadata
		if (notebook.metadata) {
			let metaStr = JSON.stringify(notebook.metadata, null, 2);
			metaStr = metaStr.split('\n').map(line => `${commentChars} ${this.META_PREFIX} ${line}`).join('\n');
			output += `${commentChars} ${this.METADATA_CELL_SUFFIX} ${this.CELL_SEPARATOR_ASTERIXES}\n\n${metaStr}\n\n`;
		}

		// Serialize cells
		for (const cell of notebook.cells as FabricSparkNotebookCell[]) {
			let cellType: string;
			let cellContent: string;

			if (cell.kind === vscode.NotebookCellKind.Code) {
				cellType = this.CODE_CELL_SUFFIX;
				cellContent = cell.value;

				// Handle magic if present
				const magic = cell.metadata?.magic;
				if (magic) {
					cellContent = cell.value.split("\n").map(line => `${commentChars} ${this.MAGIC_PREFIX} ${line}`).join("\n");
				}

				// Serialize cell metadata
				if (cell.metadata) {
					let metaStr = JSON.stringify(cell.metadata, null, 2);
					metaStr = metaStr.split('\n').map(line => `${commentChars} ${this.META_PREFIX} ${line}`).join('\n');
					cellContent += `\n\n${commentChars} ${this.METADATA_CELL_SUFFIX} ${this.CELL_SEPARATOR_ASTERIXES}\n\n${metaStr}`;	
				}
			}
			else if (cell.kind === vscode.NotebookCellKind.Markup) {
				cellType = this.MARKDOWN_CELL_SUFFIX;
				cellContent = cell.value;
			}

			output += `${commentChars} ${cellType} ${this.CELL_SEPARATOR_ASTERIXES}\n\n${cellContent}\n`;	
		}

		return Buffer.from(output);
	}
	public async xxx(data: FabricSparkNotebook, token: vscode.CancellationToken): Promise<Uint8Array> {
		// // Map the Notebook data into the format we want to save the Notebook data as
		// let notebook: FabricSparkNotebook = data;

		// let notebookLanguage: DatabricksLanguageMapping = notebook.metadata.notebookLanguage;

		// for (const cell of notebook.cells as FabricSparkNotebookCell[]) {
		// 	if (cell.kind == vscode.NotebookCellKind.Markup) {
		// 		cell.magic = "%%md";
		// 		cell.value = `${notebookLanguage.commentCharacters} ${this.MAGIC_PREFIX} ${cell.magic}\n${cell.value}`;
		// 	}

		// 	if (cell.magic) {
		// 		cell.value = cell.value.replace("\n", `\n${notebookLanguage.commentCharacters} ${this.MAGIC_PREFIX} `);
		// 	}
		// }

		// const headerLine = `${notebookLanguage.commentCharacters} ${this.HEADER_SUFFIX}\n`;
		// const codeLines = notebook.cells.flatMap(x => x.value).join(`\n\n${notebookLanguage.commentCharacters} ${this.CELL_SEPARATOR_SUFFIX}\n\n`)


		// // Give a string of all the data to save and VS Code will handle the rest
		// return await Buffer.from(headerLine + codeLines);

		return undefined;
	}
}