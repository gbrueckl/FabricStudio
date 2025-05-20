import * as vscode from 'vscode';
import { FabricApiTreeItem } from '../treeviews/FabricApiTreeItem';
import { FabricApiItemType } from '../../fabric/_types';
import { Helper } from '@utils/Helper';

export class FabricQuickPickItem implements vscode.QuickPickItem {
	private _label: string;
	private _kind: vscode.QuickPickItemKind = vscode.QuickPickItemKind.Default;
	private _value?: string;
	private _description?: string;
	private _details?: string;
	private _picked?: boolean;
	private _iconPath?: vscode.Uri;
	private _alwaysShow: boolean = false;
	private _apiItem?: FabricApiTreeItem;
	private _workspaceId?: string;
	private _itemType?: FabricApiItemType;

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

	// The kind of QuickPickItem that will determine how this item is rendered in the quick pick.
	get kind(): vscode.QuickPickItemKind {
		return this._kind;	
	}

	set kind(value: vscode.QuickPickItemKind) {	
		this._kind = value;
	}

	// The icon path for the QuickPickItem.
	get iconPath(): vscode.Uri {
		if (this._iconPath) {
			return this._iconPath;
		}
		else if(this._itemType) {
			return Helper.getIconPath(this.itemType);
		}
	}

	set iconPath(value: vscode.Uri) {
		this._iconPath = value;
	}

	// A human-readable string which is rendered less prominent in the same line.
	get description(): string {
		return this._description ?? this.value;
	}

	set description(value: string) {
		this._description = value;
	}

	// A human-readable string which is rendered less prominent in a separate line.
	get detail(): string {
		return this._details;
	}

	set detail(value: string) {
		this._details = value;
	}

	// Optional flag indicating if this item is picked initially.
	get picked(): boolean {
		return this._picked;
	}

	set picked(value: boolean) {
		this._picked = value;
	}

	// Optional flag indicating if this item should always be shown in the list.
	get alwaysShow(): boolean {
		return this._alwaysShow;
	}
	
	set alwaysShow(value: boolean) {
		this._alwaysShow = value;
	}

	get apiItem(): FabricApiTreeItem {
		return this._apiItem;
	}

	set apiItem(value: FabricApiTreeItem) {
		this._apiItem = value;
	}

	get workspaceId(): string {
		return this._workspaceId;
	}
	set workspaceId(value: string) {
		this._workspaceId = value;
	}

	get itemType(): FabricApiItemType {
		if (this._itemType) {
			return this._itemType;
		}
		return this.apiItem?.itemType;
	}

	set itemType(value: FabricApiItemType) {
		this._itemType = value;
	}
}