import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { ThisExtension } from '../../../ThisExtension';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricItemDefinition } from './FabricItemDefinition';
import { FabricFSUri } from '../../filesystemProvider/FabricFSUri';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemDefinitionFolder extends FabricWorkspaceGenericFolder {
	constructor(
		uri: vscode.Uri,
		parent: FabricItemDefinition | FabricItemDefinitionFolder
	) {
		super(`${parent.id}/${uri.path}`, "Folder", "ItemDefinitionFolder", parent, "");

		this.id = `${parent.id}/${uri.path}`;
		this.itemId = parent.itemId;
		this.itemName = uri.path.split('/').pop();

		this.resourceUri = uri;
		// below values are derived from resourceUri!
		this.iconPath = undefined;
		this.label = undefined;
		this.description = undefined;
	}

	get _contextValue(): string {
		return this.definitionRoot._contextValue;
	}

	get parent(): FabricItemDefinition | FabricItemDefinitionFolder {
		return this._parent as FabricItemDefinition | FabricItemDefinitionFolder;
	}

	get definitionRoot(): FabricItemDefinition {
		return this.parent.definitionRoot;
	}

	/* Overwritten properties from FabricApiTreeItem */
	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		return this.definitionRoot.getChildrenFromFS(this, element);
	}

	public get canOpenInBrowser(): boolean {
		return false;
	}

	get apiPath(): string {
		return this.parent.apiPath;
	}

	get fabricFsUri(): FabricFSUri {
		if (this.resourceUri) {
			return new FabricFSUri(this.resourceUri);
		}
	}

	get canDelete(): boolean {
		return false;
	}
}