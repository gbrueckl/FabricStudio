import * as vscode from 'vscode';
import { FabricApiTreeItem } from '../treeviews/FabricApiTreeItem';

export class FabricQuickPickItem implements vscode.QuickPickItem {
	private _label: string;
	private _value?: string;
	private _description?: string;
	private _details?: string;
	private _picked?: boolean;
	private _apiItem?: FabricApiTreeItem;

	constructor(
		label: string,
		value?: string,
		description?: string,
		details?: string,
		picked?: boolean
	) {
		this._label = label;
		this._value = value;
		this._description = description;
		this._details = details;
		this._picked = picked ?? false;
	}

	// A human-readable string which is rendered prominent.
	get label(): string {
		return this._label
	}

	// The value used when this item is selected
	get value(): string {
		return this._value ?? this.label;
	}

	// A human-readable string which is rendered less prominent in the same line.
	get description(): string {
		return this._description ?? this.value;
	}

	// A human-readable string which is rendered less prominent in a separate line.
	get detail(): string {
		return this._details;
	}

	// Optional flag indicating if this item is picked initially.
	get picked(): boolean {
		return this._picked;
	}

	set picked(value: boolean) {
		this._picked = value;
	}

	get apiItem(): FabricApiTreeItem {
		return this._apiItem;
	}

	set apiItem(value: FabricApiTreeItem) {
		this._apiItem = value;
	}
}