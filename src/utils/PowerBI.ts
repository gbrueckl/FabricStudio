import * as vscode from 'vscode';

import { Helper } from '@utils/Helper';
import { Buffer } from '@env/buffer';

import { ThisExtension } from './../ThisExtension';

import { FABRIC_SCHEME } from '../vscode/filesystemProvider/FabricFileSystemProvider';
import { FabricCommandBuilder } from '../vscode/input/FabricCommandBuilder';
import { FabricQuickPickItem } from '../vscode/input/FabricQuickPickItem';
import { FabricApiService } from '../fabric/FabricApiService';
import { iFabricApiItem } from '../fabric/_types';

class PBIPStructure {
	private _name: string;
	private _rootUri: vscode.Uri;
	constructor(
		name: string,
		rootUri: vscode.Uri
	) {
		this._name = name.replace(".pbip", "");
		this._rootUri = rootUri;
	}

	static fromUri(uri: vscode.Uri): PBIPStructure {
		const name = uri.path.split("/").pop().replace(".pbip", "");
		const rootUri = uri.with({ path: uri.path.replace(name + ".pbip", "") });
		return new PBIPStructure(name, rootUri);
	}

	get basename(): string {
		return this._name;
	}
	get pbipFileName(): string {
		return this._name + ".pbip";
	}
	get pbipFileUri(): vscode.Uri {
		return vscode.Uri.joinPath(this._rootUri, this.pbipFileName);
	}

	get reportFolderName(): string {
		return this._name + ".Report";
	}
	get reportFolderUri(): vscode.Uri {
		return vscode.Uri.joinPath(this._rootUri, this.reportFolderName);
	}
	get reportPbirUri(): vscode.Uri {
		return vscode.Uri.joinPath(this.reportFolderUri, "definition.pbir");
	}

	get datasetFolderName(): string {
		return this._name + ".SemanticModel";
	}
	get datasetFolderUri(): vscode.Uri {
		return vscode.Uri.joinPath(this._rootUri, this.datasetFolderName);
	}
}

export class PowerBI {
	private static async showPBIPSaveDialog(defaultName: string): Promise<PBIPStructure | undefined> {
		if (!defaultName.endsWith(".pbip")) {
			defaultName += ".pbip";
		}
		const output = await vscode.window.showSaveDialog({
			title: `Download PBIP file`,
			defaultUri: vscode.Uri.file(defaultName),
			filters: {
				"PBIP files": ["pbip"]
			}
		});

		if (!output) {
			return undefined;
		}

		ThisExtension.Logger.logDebug("PBIP file save location: " + output);

		return new PBIPStructure(
			output.path.split("/").pop(),
			Helper.parentUri(output)
		);
	}

	private static async createLocalPBIPFile(pbip: PBIPStructure): Promise<void> {
		ThisExtension.Logger.logInfo(`Creating local PBIP file at ${pbip.pbipFileUri} ...`);
		let pbipTemplate = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'templateFiles', 'Empty.pbip'));
		let pbipContent = Buffer.from(pbipTemplate).toString("utf8").replace('"Empty.Report"', `"${pbip.reportFolderName}"`);
		await vscode.workspace.fs.writeFile(pbip.pbipFileUri, Buffer.from(pbipContent, "utf8"));
	}

	private static async downloadReportDefinition(reportId: string, workspaceId: string, targetUri: vscode.Uri, showMessage: number = 3000): Promise<vscode.Uri> {
		const action = PowerBI.downloadDefinition(reportId, workspaceId, "Report", targetUri);

		if (showMessage > 0) {
			return Helper.awaitWithProgress<vscode.Uri>(
				"Downloading report definition ...",
				action,
				showMessage
			)
		}
		else {
			return action;
		}
	}

	private static async downloadDatasetDefinition(datasetId: string, workspaceId: string, targetUri: vscode.Uri, showMessage: number = 3000): Promise<vscode.Uri> {
		const action = PowerBI.downloadDefinition(datasetId, workspaceId, "SemanticModel", targetUri);

		if (showMessage > 0) {
			return Helper.awaitWithProgress<vscode.Uri>(
				"Downloading semantic model definition ...",
				action,
				showMessage
			)
		}
		else {
			return action;
		}

	}

	private static async downloadDefinition(
		itemId: string, 
		workspaceId: string, 
		itemType: "Report" | "SemanticModel", 
		targetUri: vscode.Uri, 
		overwrite: boolean = true
		): Promise<vscode.Uri> {
		ThisExtension.Logger.logDebug(`Downloading ${itemType} definition (Workspace: ${workspaceId}, Item: ${itemId}) ...`);
		// initialize Fabric FS for the dataset definition
		const resourceUri = vscode.Uri.parse(`${FABRIC_SCHEME}:///workspaces/${workspaceId}/${itemType}s/${itemId}`);
		const items = await vscode.workspace.fs.readDirectory(resourceUri);

		ThisExtension.Logger.logInfo(`Downloading PBIP semantic folder file to ${targetUri} ...`);

		await vscode.workspace.fs.copy(resourceUri, targetUri, { overwrite: overwrite });

		return targetUri;
	}

	public static async downloadReportAsPBIP(reportId: string, workspaceId: string): Promise<vscode.Uri> {
		// get Report Details from PowerBI API
		const reportDetails = await FabricApiService.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`);

		if (reportDetails.error) {
			ThisExtension.Logger.logError(reportDetails.error.message);
			return undefined;
		}
		const srcReport = reportDetails.success;

		// QuickPick - live connection or with dataset
		let qpLiveConnection = new FabricQuickPickItem("Live Connection", "Live Connection", "The downloaded report will use a live connection to the dataset.");
		qpLiveConnection.iconPath = new vscode.ThemeIcon("globe");
		let qpLocalDataset = new FabricQuickPickItem("Local Dataset", "Local Dataset", "Also download the definitions connected dataset locally. This requires access to the datasource(s) and a refresh of the local dataset.");
		qpLocalDataset.iconPath = new vscode.ThemeIcon("debug-disconnect");
		const connModeQp = await FabricCommandBuilder.showQuickPick(
			[qpLiveConnection, qpLocalDataset],
			`How do you want to connect to the data?`, 
			undefined,
			"Live Connection");

		if (!connModeQp) {
			Helper.showTemporaryInformationMessage("Download cancelled.");
			return;
		}

		const pbip = await PowerBI.showPBIPSaveDialog(srcReport.name);
		if (!pbip) {
			Helper.showTemporaryInformationMessage("Download cancelled.");
			return;
		}

		let connectionMode = connModeQp.value;

		await PowerBI.createLocalPBIPFile(pbip);
		await PowerBI.downloadReportDefinition(srcReport.id || reportId, workspaceId, pbip.reportFolderUri);

		if (connectionMode == "Local Dataset") {
			await PowerBI.downloadDatasetDefinition(srcReport.datasetId, srcReport.datasetWorkspaceId, pbip.datasetFolderUri);

			let pbirDef = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'templateFiles', 'Empty.Report', 'definition.pbir'));
			let pbirDefContent = Buffer.from(pbirDef).toString("utf8").replace('"../Empty.SemanticModel"', `"../${pbip.datasetFolderName}"`);

			await vscode.workspace.fs.writeFile(pbip.reportPbirUri, Buffer.from(pbirDefContent, "utf8"));
		}

		return undefined;
	}

	public static async downloadDatasetAsPBIP(datasetId: string, workspaceId: string): Promise<vscode.Uri> {
		const datasetDetails = await FabricApiService.get<iFabricApiItem>(`/workspaces/${workspaceId}/SemanticModels/${datasetId}`);

		if (datasetDetails.error) {
			ThisExtension.Logger.logError(datasetDetails.error.message);
			return undefined;
		}
		const srcDataset = datasetDetails.success;

		const pbip = await PowerBI.showPBIPSaveDialog(srcDataset.displayName);

		if (!pbip) {
			Helper.showTemporaryInformationMessage("Download cancelled.");
			return;
		}

		await PowerBI.createLocalPBIPFile(pbip);

		ThisExtension.Logger.logInfo(`Downloading dummy PBIP report folder to ${pbip.reportFolderUri.fsPath} ...`);
		let reportTemplate = vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'templateFiles', 'Empty.Report');
		await vscode.workspace.fs.copy(reportTemplate, pbip.reportFolderUri, { overwrite: false });

		let pbirDef = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(ThisExtension.rootUri, 'resources', 'templateFiles', 'Empty.Report', 'definition.pbir'));
		let pbirDefContent = Buffer.from(pbirDef).toString("utf8").replace('"../Empty.SemanticModel"', `"../${pbip.datasetFolderName}"`);
		await vscode.workspace.fs.writeFile(pbip.reportPbirUri, Buffer.from(pbirDefContent, "utf8"));

		await PowerBI.downloadDatasetDefinition(datasetId, workspaceId, pbip.datasetFolderUri);
	}
}