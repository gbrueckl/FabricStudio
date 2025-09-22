import * as vscode from 'vscode';

import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import { iFabricApiWarehouseRestorePoint } from '../../../fabric/_types';
import { FabricWorkspaceGenericViewer } from './FabricWorkspaceGenericViewer';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricWarehouseRestorePoint extends FabricWorkspaceGenericViewer {
	constructor(
		definition: iFabricApiWarehouseRestorePoint,
		parent: FabricWorkspaceTreeItem
	) {
		super(definition.displayName, parent, definition.id, "WarehouseRestorePoint");

		this.id = parent.id + "/" + definition.id;
		this.itemDefinition = definition;

		this.label = this._label;
		this.description = this._description;
		this.contextValue = this._contextValue;
	}

	/* Overwritten properties from FabricApiTreeItem */
	get _label(): string {
		if(this.itemDefinition.creationMode === "SystemCreated") {
			return `${this.itemDefinition.creationDetails.eventDateTime} (SYSTEM)`;
		}
		else {
			return `${this.itemDefinition.creationDetails.eventDateTime} (${this.itemDefinition.displayName})`;
		}
	}

	get _description(): string {
		const initiator = this.itemDefinition?.creationDetails?.eventInitiator;

		if (initiator) {
			return `${this.itemDefinition.creationMode} ${initiator.type}: ${initiator.id}`;
		}
		return `${this.itemDefinition?.creationMode}`;
	}

	get _contextValue(): string {
		let orig: string = super._contextValue;

		let actions: string[] = [];
		
		if(this.itemDefinition?.creationMode === "UserDefined") {
			actions.push("DELETE");
		}

		return orig + actions.join(",") + ",";
	}

	get itemDefinition(): iFabricApiWarehouseRestorePoint {
		return <iFabricApiWarehouseRestorePoint>this._itemDefinition;
	}

	set itemDefinition(value: iFabricApiWarehouseRestorePoint) {
		this._itemDefinition = value;
	}

	get eventDateTime(): string {
		return this.itemDefinition.creationDetails.eventDateTime;
	}
	
	get canDelete(): boolean {
		return false; // delete-logic is implemented in _contextValue
	}
}