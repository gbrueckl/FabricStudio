import * as vscode from 'vscode';

export abstract class FabricMapper {
	private static _mappings: Map<RegExp, string> = new Map([
		[/workspace/gmi, "group"], 
		[/\/semanticmodel/gmi, "dataset"],
		[/\/datapipelines/gmi, "pipelines"]
	]);
	


	static mapForBrowserUrl(url: string): string {
		for (let item of this._mappings.entries()) {
			url = url.replace(item[0], item[1]);
		}

		return url;
	}

}