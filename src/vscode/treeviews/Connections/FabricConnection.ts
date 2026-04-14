import * as vscode from 'vscode';

import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { iFabricApiConnection, iFabricApiConnectionRoleAssignment } from '../../../fabric/_types';
import { FabricConnectionGenericViewer } from './FabricConnectionGenericViewer';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { ThisExtension } from '../../../ThisExtension';
import { FabricConnectionRoleAssignments } from './FabricConnectionRoleAssignments';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../FabricApiTreeItem';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { Helper } from '@utils/Helper';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricConnection extends FabricConnectionGenericFolder {

	constructor(
		definition: iFabricApiConnection,
		parent: FabricConnectionTreeItem
	) {
		super(definition.id, definition.displayName, "Connection", parent, "connections");
		{
			this.itemDefinition = definition;

			this.tooltip = this.getToolTip(definition);
			this.iconPath = new vscode.ThemeIcon("extensions-remote");
			this.description = `${definition.connectionDetails.type} - ${definition.id}`;
			this.iconPath = this.getIcon();
			this.label = this.label ?? definition.connectionDetails.path ?? definition.id;
		}
	}

	/* Overwritten properties from FabricConnectionGenericViewer */
	get apiPath(): string {
			return `v1/connections/${this.itemDefinition?.id ?? this.itemId}/`;
		}

		getIcon() {
			if (this.itemDefinition) {
				return FabricConnection.getIconByConnectivityType(this.itemDefinition.connectivityType);
			}
		}

	static getIconByConnectivityType(connectivityType: string): vscode.ThemeIcon {
		if (connectivityType) {
			if (connectivityType === "OnPremisesGatewayPersonal" || connectivityType === "OnPremisesGateway") {
				return new vscode.ThemeIcon("cloud-upload");
			}
			else if (connectivityType === "ShareableCloud") {
				return new vscode.ThemeIcon("issue-reopened");
			}
			else if (connectivityType === "PersonalCloud") {
				return new vscode.ThemeIcon("issue-draft");
			}
		}
		return new vscode.ThemeIcon("extensions-remote");
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		let children: FabricConnectionTreeItem[] = [];
		if (this._children) {
			children = this._children
		}

		// Role Assignments
		let roleAssignments = new FabricConnectionRoleAssignments(this);
		children.push(roleAssignments);

		Helper.sortArrayByProperty(children);

		return children;
	}

	async addRoleAssignment(identity: iFabricApiConnectionRoleAssignment, showInfoMessage: boolean = true): Promise<void> {
		// https://learn.microsoft.com/en-us/rest/api/fabric/core/connections/add-connection-role-assignment?tabs=HTTP
		/*
		POST https://api.fabric.microsoft.com/v1/connections/f3a2e6af-d048-4f85-94d9-b3d16140df05/roleAssignments
		{
			"principal": {
				"id": "6a002b3d-e4ec-43df-8c08-e8eb7547d9dd",
				"type": "User"
			},
			"role": "Owner"
		}
		*/
		const apiPath = Helper.joinPath(this.apiPath, "roleAssignments");

		const response = await FabricApiService.post(apiPath, identity, { "raw": false, "awaitLongRunningOperation": false });

		if (response.error) {
			vscode.window.showErrorMessage(response.error.message);
		}
		else {
			if (showInfoMessage) {
				Helper.showTemporaryInformationMessage(`Adding Connection Role-Assignment for identity '${identity.principal.displayName || identity.principal.id}'`, 3000);
			}
		}
	}

	/**
	 * Tests the connection by calling the test-connection API endpoint.
	 * Shows a progress bar during the test and displays the result.
	 * https://learn.microsoft.com/en-us/rest/api/fabric/core/connections/test-connection?tabs=HTTP
	 */
	async testConnection(): Promise<void> {
		// AIDEV-NOTE: Test connection uses POST with empty body to the test-connection endpoint
		const testConnectionPath = Helper.joinPath(this.apiPath, "testConnection");

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Testing connection '${this.label}'...`,
				cancellable: false
			},
			async () => {
				try {
					const response = await FabricApiService.post<{
						status?: string,
						errors?: { message?: string, errorCode?: string }[]
					}>(testConnectionPath, {}, { "raw": false, "awaitLongRunningOperation": true });

					if (response.error) {
						ThisExtension.Logger.logError(`Connection test failed: ${response.error.message}`, true);
					}
					else {
						const status = response.success?.status;
						if (status === "Online") {
							ThisExtension.Logger.logInfo(`Connection test succeeded for '${this.label}'`, 5000);
						}
						else {
							const errorDetails = (response.success?.errors ?? [])
								.map(error => `${error.errorCode ? `[${error.errorCode}] ` : ""}${error.message ?? "Unknown error"}`)
								.join(" | ");

							const errorMessage = `Connection test failed for '${this.label}' (status: ${status ?? "Unknown"})${errorDetails ? `. Details: ${errorDetails}` : ""}`;
							ThisExtension.Logger.logError(errorMessage, true);
						}
					}
				}
				catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					ThisExtension.Logger.logError(`Connection test error: ${errorMessage}`, true);
				}
			}
		);
	}

	get _contextValue(): string {
		let actions = super._contextValue;
		actions += "TEST_CONNECTION,";
		return actions;
	}
}