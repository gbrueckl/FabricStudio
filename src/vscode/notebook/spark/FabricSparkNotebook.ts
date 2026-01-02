import * as vscode from 'vscode';


export const FabricSparkNotebookType: string = 'fabric-spark-notebook';



export class FabricSparkNotebook extends vscode.NotebookData {
	// empty for now, might be extended in the future if new features are added

	cells: FabricSparkNotebookCell[];

	static getEmptyNotebook(): string {
		return `{
	"cells": [ ],
	"metadata": {
		"kernel_info": {
			"name": "synapse_pyspark"
		},
		"kernelspec": {
			"display_name": "Synapse PySpark",
			"language": "Python",
			"name": "synapse_pyspark"
		},
		"language_info": {
			"name": "python"
		},
		"microsoft": {
			"language": "python",
			"language_group": "synapse_pyspark",
			"ms_spell_check": {
				"ms_spell_check_language": "en"
			}
		},
		"nteract": {
			"version": "nteract-front-end@1.0.0"
		},
		"spark_compute": {
			"compute_id": "/trident/default",
			"session_options": {
				"conf": {
				"spark.synapse.nbs.session.timeout": "1200000"
				}
			}
		},
		"widgets": {}
		}
	},
	"nbformat": 4,
	"nbformat_minor": 5
}`
	}
}

export class FabricSparkNotebookCell extends vscode.NotebookCellData {

	static loadFromSource(cellSource: string, notebooklanguageId: string): FabricSparkNotebookCell {
		return undefined;
	}

	get magic(): string {
		if (this.value.startsWith("%%")) {
			return this.value.split(" ")[0];
		}
	}

	set magic(newMagic: string) {
		if (this.value.startsWith("%%")) {
			this.value = this.value.replace(this.magic, newMagic);
		}
		else {
			this.value = newMagic + "\n" + this.value;
		}
	}
}

