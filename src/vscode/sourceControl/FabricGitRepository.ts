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

	private _remoteCommitHash: string;
	private _workspaceHead: string;

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

		this._stagedChanges = this.SCM.createResourceGroup(ResourceGroupType.StagedChanges, 'Staged Changes (to be committed)');
		this._changes = this.SCM.createResourceGroup(ResourceGroupType.Changes, 'Changes in Workspace');
		this._updates = this.SCM.createResourceGroup(ResourceGroupType.Updates, 'Updates from GIT');

		this._changes.hideWhenEmpty = true;
		this._stagedChanges.hideWhenEmpty = true;
		this._updates.hideWhenEmpty = true;
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

	private getResourceState(change: iFabricApiGitItemChange): vscode.SourceControlResourceState {
		const absolutePath = vscode.Uri.joinPath(this.rootUri, change.itemMetadata.itemType, change.itemMetadata.displayName);
		return {
			resourceUri: absolutePath,
			"command": { "title": "Open", "command": "vscode.open", "arguments": [absolutePath] },
			"decorations": undefined,
			"contextValue": undefined,
		}
	}


	//#region Commands
	public async refresh(): Promise<void> {
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

		this._remoteCommitHash = response.success.remoteCommitHash;
		this._workspaceHead = response.success.workspaceHead;
	}

	public async stageChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const stagedChanges = this._stagedChanges.resourceStates.concat(resourceStates);
		const changes = this._changes.resourceStates.filter(resourceState => !resourceStates.includes(resourceState))

		this._changes.resourceStates = changes;
		this._stagedChanges.resourceStates = stagedChanges;
	}

	public async unstageChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const changes = this._changes.resourceStates.concat(resourceStates);
		const stagedChanges = this._stagedChanges.resourceStates.filter(resourceState => !resourceStates.includes(resourceState))

		this._changes.resourceStates = changes;
		this._stagedChanges.resourceStates = stagedChanges;
	}

	public async discardChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {

	}

	public async commitStagedChanges(): Promise<void> {
		/*
		{
		"mode": "Selective",
		"workspaceHead": "eaa737b48cda41b37ffefac772ea48f6fed3eac4",
		"comment": "I'm committing specific changes.",
		"items": [
			{
			"logicalId": "111e8d7b-4a95-4c02-8ccd-6faef5ba1bd1",
			"objectId": "1153f3b4-dbb8-33c1-a84f-6ae4d776362d"
			},
			{
			"objectId": "7753f3b4-dbb8-44c1-a94f-6ae4d776369e"
			}
		]
		}
		*/
	}

	//#endregion





	dispose() {
		this.SCM.dispose();
	}
}
