import * as vscode from 'vscode';

import { UniqueId } from '@utils/Helper';
import { FabricGitRepository } from './FabricGitRepository';
import { FabricFSUri } from '../filesystemProvider/FabricFSUri';
import { ThisExtension } from '../../ThisExtension';
import { FabricGitResourceState } from './FabricGitResourceState';



export abstract class FabricGitRepositories {
	private static _repositories: FabricGitRepository[] = [];

	public static async initializeRepository(workspaceId: UniqueId): Promise<FabricGitRepository> {
		const repository = await FabricGitRepository.getInstance(workspaceId)
		this._repositories.push(repository);
		return repository;
	}

	private static async getRepository(source: FabricGitResourceState[] | vscode.Uri): Promise<FabricGitRepository> {
		let fabricUri: FabricFSUri;
		if (source instanceof vscode.Uri) {
			fabricUri = await FabricFSUri.getInstance(source, true);
		}
		else if (source instanceof Array) {
			if (source.length == 0) {
				ThisExtension.Logger.logWarning("No resource states provided to stageChanges command!");
				return;
			}
			fabricUri = await FabricFSUri.getInstance(source[0].resourceUri, true);
		}
		return this._repositories.find(repository => repository.workspaceId === fabricUri.workspaceId);
	}

	public static async stageChanges(...resourceStates: FabricGitResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.stageChanges(...resourceStates);
	}

	public static async unstageChanges(...resourceStates: FabricGitResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.unstageChanges(...resourceStates);
	}

	public static async discardChanges(...resourceStates: FabricGitResourceState[]): Promise<void> {
		const repository = await FabricGitRepositories.getRepository(resourceStates);
		repository.discardChanges(...resourceStates);
	}

	public static async commitStagedChanges(repository: vscode.SourceControl): Promise<void> {
		const fabricRepo = await FabricGitRepositories.getRepository(repository.rootUri);
		fabricRepo.commitStagedChanges();
	}
}
