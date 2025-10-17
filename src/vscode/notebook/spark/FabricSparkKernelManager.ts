import * as vscode from 'vscode';

import { ThisExtension } from '../../../ThisExtension';
import { iFabricApiLakehouse, iFabricApiLivySession } from '../../../fabric/_types';
import { FabricSparkKernel } from './FabricSparkKernel';
import { FabricSparkLivySession } from './FabricSparkLivySession';
import { NotebookType } from './_types';


export abstract class FabricSparkKernelManager {
	private static JupyterKernelSuffix: string = "-jupyter-notebook";
	private static FabricSparkKernelSuffix: string = "-fabric-spark-notebook";

	// Kernels are the list of compute resources that can be selected for a notebook
	private static _kernels: Map<string, FabricSparkKernel> = new Map<string, FabricSparkKernel>();

	static async initialize(): Promise<void> {
		// ThisExtension.Logger.logInfo("Initializing Kernels ...");

		// do something

		// ThisExtension.Logger.logInfo("Kernels initialized!");
	}


	static setKernel(kernelName: string, kernel: FabricSparkKernel): void {
		if (!this._kernels.has(kernelName)) {
			this._kernels.set(kernelName, kernel);
		}
	}

	static removeKernel(kernelName: string): void {
		if (this._kernels.has(kernelName)) {
			let kernel: FabricSparkKernel = this.getKernel(kernelName);
			kernel.dispose();
		}
	}

	static getKernel(kernelName: string): FabricSparkKernel {
		return this._kernels.get(kernelName);
	}

	static getJupyterKernelName(lakehouse: iFabricApiLakehouse): string {
		return (lakehouse.id ?? lakehouse.displayName) + FabricSparkKernelManager.JupyterKernelSuffix;
	}

	static getJupyterKernel(lakehouse: iFabricApiLakehouse): FabricSparkKernel {
		return this.getKernel(this.getJupyterKernelName(lakehouse));
	}

	static jupyterKernelExists(lakehouse: iFabricApiLakehouse): boolean {
		if (this.getKernel(this.getJupyterKernelName(lakehouse))) {
			return true;
		}
		return false;
	}

	static getFabricSparkKernelName(lakehouse: iFabricApiLakehouse): string {
		return (lakehouse.id ?? lakehouse.displayName) + FabricSparkKernelManager.FabricSparkKernelSuffix;
	}

	static getFabricSparkKernel(lakehouse: iFabricApiLakehouse): FabricSparkKernel {
		return this.getKernel(this.getFabricSparkKernelName(lakehouse));
	}

	static fabricSparkKernelExists(lakehouse: iFabricApiLakehouse): boolean {
		if (this.getFabricSparkKernel(lakehouse)) {
			return true;
		}
		return false;
	}

	static async createKernels(lakehouse: iFabricApiLakehouse): Promise<void> {
		if (!this.jupyterKernelExists(lakehouse)) {
			let SparkKernel: FabricSparkKernel = new FabricSparkKernel(lakehouse, "jupyter-notebook" as NotebookType);
			this.setKernel(this.getJupyterKernelName(lakehouse), SparkKernel);

			ThisExtension.Logger.logInfo(`Notebook Kernel for Fabric cluster '${lakehouse.id}' created!`)
		}
		else {
			ThisExtension.Logger.logInfo(`Notebook Kernel for Fabric cluster '${lakehouse.id}' already exists!`)
		}

		if (!this.fabricSparkKernelExists(lakehouse)) {
			let fabricSparkKernel: FabricSparkKernel = new FabricSparkKernel(lakehouse, "fabric-spark-notebook" as NotebookType);
			this.setKernel(this.getFabricSparkKernelName(lakehouse), fabricSparkKernel);

			ThisExtension.Logger.logInfo(`Fabric Kernel for Fabric cluster '${lakehouse.id}' created!`)
		}
		else {
			ThisExtension.Logger.logInfo(`Fabric Kernel for Fabric cluster '${lakehouse.id}' already exists!`)
		}
	}

	static async removeKernels(lakehouse: iFabricApiLakehouse, logMessages: boolean = true): Promise<void> {
		if (this.jupyterKernelExists(lakehouse)) {
			this.removeKernel(this.getJupyterKernelName(lakehouse));
			if (logMessages) {
				ThisExtension.Logger.logInfo(`Notebook Kernel for Fabric cluster '${lakehouse.id}' removed!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.Logger.logInfo(`Notebook Kernel for Fabric cluster '${lakehouse.id}' does not exists!`)
			}
		}

		if (this.fabricSparkKernelExists(lakehouse)) {
			this.removeKernel(this.getFabricSparkKernelName(lakehouse));
			if (logMessages) {
				ThisExtension.Logger.logInfo(`Fabric Kernel for Fabric cluster '${lakehouse.id}' removed!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.Logger.logInfo(`Fabric Kernel for Fabric cluster '${lakehouse.id}' does not exists!`)
			}
		}
	}

	static async restartNotebookSession(notebook: { notebookEditor: { notebookUri: vscode.Uri } } | undefined | vscode.Uri): Promise<FabricSparkLivySession> {
		let session: FabricSparkLivySession;
		let notebookUri: vscode.Uri;

		if (notebook instanceof vscode.Uri) {
			notebookUri = notebook;
		}
		else if ((notebook as any).notebookEditor.notebookUri) {
			notebookUri = (notebook as any).notebookEditor.notebookUri;
		}

		session = await this.stopNotebookSession(notebook);

		if (session) {
			await session.start(true);
			FabricSparkLivySession.set(notebookUri.toString(), session);
		}
		else {
			// if there is no active session yet, a warning has already been displayed by stopNotebookSession()
		}

		return session;
	}

	static async stopNotebookSession(notebook: { notebookEditor: { notebookUri: vscode.Uri } } | undefined | vscode.Uri): Promise<FabricSparkLivySession> {
		let session: FabricSparkLivySession;
		let notebookUri: vscode.Uri;

		if (notebook instanceof vscode.Uri) {
			notebookUri = notebook;
		}
		else if ((notebook as any).notebookEditor.notebookUri) {
			notebookUri = (notebook as any).notebookEditor.notebookUri;
		}

		session = await FabricSparkLivySession.get(notebookUri.toString());

		if (session) {
			await session.stop();
			FabricSparkLivySession.set(notebookUri.toString(), undefined);
		}
		else {
			ThisExtension.Logger.logWarning("No active Fabric Spark session found for the current notebook.", true);
		}

		return session;
	}
}