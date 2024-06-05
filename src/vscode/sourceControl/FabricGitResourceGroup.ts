import * as vscode from 'vscode';

import { FabricGitResourceState } from './FabricGitResourceState';

// the only difference is that we overwrite the resourceStates property to be of type FabricGitResourceState[]
export class FabricGitResourceGroup implements vscode.SourceControlResourceGroup {
	id: string;
	label: string;
	hideWhenEmpty?: boolean;
	resourceStates: FabricGitResourceState[];

	constructor(id: string, label: string, hideWhenEmpty: boolean = true) {
		this.id = id;
		this.label = label;
		this.hideWhenEmpty = hideWhenEmpty;
	}

	dispose(): void {
		
	}
	
}