import * as vscode from 'vscode';
import { FabricApiItemType } from './_types';

export abstract class FabricMapper {
	private static _browserMappings: Map<RegExp, string> = new Map([
		[/workspace/gmi, "group"], 
		[/\/semanticmodel/gmi, "dataset"],
		[/\/datapipelines/gmi, "pipelines"],
		[/\/notebook/gmi, "synapsenotebook"],
		[/deploymentPipelines/gmi, "pipelines"],
	]);

	static mapForBrowserUrl(url: string): string {
		for (let item of this._browserMappings.entries()) {
			url = url.replace(item[0], item[1]);
		}

		return url;
	}


	private static _pluralMappings: Map<string, string> = new Map([
		["Reflex", "Reflexes"],
	]);

	static getItemTypePlural(itemType: string): FabricApiItemType {
		if(itemType.endsWith("s")) {
			return itemType as FabricApiItemType;
		}

		const plural = this._pluralMappings.get(itemType) || itemType + "s";

		return plural as FabricApiItemType;
	}

	private static _jobTypeMapping: Map<FabricApiItemType, string> = new Map([
		// job types are case-sensitive!!!
		["DataPipeline", "Pipeline"], 
		["Notebook", "RunNotebook"],
		["SparkJobDefinition", "sparkjob"], 
	]);

	static get ItemTypesWithJob(): FabricApiItemType[] {
		return Array.from(this._jobTypeMapping.keys());
	}

	static getItemTypeJobType(itemType: FabricApiItemType): string {
		const jobType = this._jobTypeMapping.get(itemType);

		return jobType;
	}

}