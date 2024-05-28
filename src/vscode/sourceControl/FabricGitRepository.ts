import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { UniqueId } from '@utils/Helper';
import { iFabricApiGitItemChange, iFabricApiGitStatusResponse, iFabricApiItem, iFabricApiWorkspace } from '../../fabric/_types';
import { FABRIC_SCHEME } from '../filesystemProvider/FabricFileSystemProvider';



export const enum ResourceGroupType {

	Changes = "changes", // Changes (in Workspace)
	StagedChanges = "stagedChanges", // Staged Changes (to be committed)
	Updates = "updates", // Updates (from GIT)
};

export class FabricGitRepository implements vscode.Disposable {
	readonly rootUri: vscode.Uri;
	private _workspace: iFabricApiWorkspace;
	private _scm: vscode.SourceControl;
	resourceStates: vscode.SourceControlResourceState[] = [];


	private _changes: vscode.SourceControlResourceGroup; // Changes (in Workspace)
	private _stagedChanges: vscode.SourceControlResourceGroup; // Staged Changes (to be committed)
	private _updates: vscode.SourceControlResourceGroup; // Updates (from GIT)

	constructor(
		workspace: iFabricApiWorkspace
	) {
		this.rootUri = vscode.Uri.parse(`${FABRIC_SCHEME}://workspaces/${workspace.id}`);

		this._workspace = workspace;

		this._scm = vscode.scm.createSourceControl('fabric-git', 'Fabric GIT - ' + this.workspaceName, this.rootUri);

		this.SCM.acceptInputCommand = { command: 'fabric.git.acceptInput', title: 'Accept Input' };
		this.SCM.commitTemplate = 'feat: ';
		this.SCM.count = 123;
		this.SCM.inputBox.placeholder = 'Message (press Ctrl+Enter to commit)';
		//this.SCM.inputBox.value = 'My prefilled value';

		this._changes = this.SCM.createResourceGroup(ResourceGroupType.Changes, 'Changes in Workspace');
		this._stagedChanges = this.SCM.createResourceGroup(ResourceGroupType.StagedChanges, 'Staged Changes (to be committed)');
		this._updates = this.SCM.createResourceGroup(ResourceGroupType.Updates, 'Updates from GIT');
	}
	quickDiffProvider?: vscode.QuickDiffProvider;
	commitTemplate?: string;
	acceptInputCommand?: vscode.Command;
	statusBarCommands?: vscode.Command[];

	static async getInstance(workspaceId: UniqueId): Promise<FabricGitRepository> {
		const response = await FabricApiService.getWorkspace(workspaceId);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
			return;
		}

		const git = new FabricGitRepository(response.success);

		await git.refresh();
		return git;
	}

	get workspaceId(): UniqueId {
		return this._workspace.id;
	}

	get workspaceName(): string {
		return this._workspace.displayName;
	}

	private get SCM(): vscode.SourceControl {
		return this._scm;
	}

	readonly inputBox: vscode.SourceControlInputBox = this.SCM?.inputBox;
	count = this.SCM?.count;

	createResourceGroup(id: string, label: string): vscode.SourceControlResourceGroup {
		return this.SCM.createResourceGroup(id, label);

	}

	public async refresh(): Promise<void> {
		/*
				const workingTree = this.createResourceGroup('workingTree', 'Changes');
				workingTree.resourceStates = [
					{ resourceUri: this.createResourceUri('.travis.yml') },
					{ resourceUri: this.createResourceUri('README.md') }
				];
				*/

		const response = await FabricApiService.get<iFabricApiGitStatusResponse>(`/v1/workspaces/${this.workspaceId}/git/status`);

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}

		// seems like we cannot ".push" to this._index.resourceStates but only assign a new array directly
		let changes: vscode.SourceControlResourceState[] = [];
		let updates: vscode.SourceControlResourceState[] = [];
		for (const change of response.success.changes) {
			const resourceState = this.getResourceState(change);
			if (change.workspaceChange) {
				changes.push(resourceState);
			}

			if (change.remoteChange) {
				updates.push(resourceState);
			}
		}

		this.SCM.count = response.success.changes.length;

		this._changes.resourceStates = changes;
		this._updates.resourceStates = updates;
	}

	private getResourceState(change: iFabricApiGitItemChange): vscode.SourceControlResourceState {
		const absolutePath = vscode.Uri.joinPath(this.rootUri, change.itemMetadata.itemType, change.itemMetadata.displayName);
		return {
			resourceUri: absolutePath,
			"command": { "title": "Open", "command": "vscode.open", "arguments": [absolutePath] },
			"decorations": undefined,
			"contextValue": undefined,
		}
	}



	dispose() {
		this.SCM.dispose();
	}
}
