import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { UniqueId } from '@utils/Helper';
import { iFabricApiGitItemChange, iFabricApiGitStatusResponse, iFabricApiItem, iFabricApiWorkspace } from '../../fabric/_types';
import { FABRIC_SCHEME } from '../filesystemProvider/FabricFileSystemProvider';
import { FabricGitRepository } from './FabricGitRepository';
import { FabricFSUri } from '../filesystemProvider/FabricFSUri';
import { ThisExtension } from '../../ThisExtension';



export abstract class FabricGitRepositories {
	private static _repositories: FabricGitRepository[] = [];

	public static async initializeRepository(workspaceId: UniqueId): Promise<FabricGitRepository> {
		const repository = await FabricGitRepository.getInstance(workspaceId)
		this._repositories.push(repository);
		return repository;
	}

	private static async getRepository(resourceStates: vscode.SourceControlResourceState[]): Promise<FabricGitRepository> {
		if (resourceStates.length == 0) {
			ThisExtension.Logger.logWarning("No resource states provided to stageChanges command!");
		}
		const fabricUri = await FabricFSUri.getInstance(resourceStates[0].resourceUri, true);
		return this._repositories.find(repository => repository.workspaceId === fabricUri.workspaceId);
	}

	public static async stageChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.stageChanges(...resourceStates);
	}

	public static async unstageChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.unstageChanges(...resourceStates);
	}

	public static async discardChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.discardChanges(...resourceStates);
	}

	public static async commitStagedChanges(...resourceStates: vscode.SourceControlResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.commitStagedChanges();
	}
}
