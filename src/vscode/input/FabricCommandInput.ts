import * as vscode from 'vscode';

import { FabricQuickPickItem } from './FabricQuickPickItem';
import { FabricCommandBuilder } from './FabricCommandBuilder';


export type CommandInputType =
	"FREE_TEXT"
	| "WORKSPACE_SELECTOR"
	| "DATASET_SELECTOR"
	| "REPORT_SELECTOR"
	| "DATAFLOW_SELECTOR"
	| "CAPACITY_SELECTOR"
	| "CUSTOM_SELECTOR"
	;

export class FabricCommandInput {

	private _prompt: string;
	private _inputType: CommandInputType | string;
	private _key: string;
	private _optional: boolean;
	private _description: string;
	private _currentValue: string;
	private _customOptions: FabricQuickPickItem[];

	constructor(
		prompt: string,
		inputType: CommandInputType | string,
		key: string,
		optional: boolean = false,
		description: string = null,
		currentValue?: string,
		customOptions?: FabricQuickPickItem[]
	) {
		this._prompt = prompt;
		this._inputType = inputType;
		this._key = key;
		this._optional = optional;
		this._description = description ?? prompt;
		this._currentValue = currentValue;
		this._customOptions = customOptions;
	}

	get Prompt(): string {
		return this._prompt;
	}

	get InputType(): CommandInputType | string {
		return this._inputType;
	}

	get Key(): string {
		return this._key;
	}

	get Optional(): boolean {
		return this._optional;
	}

	get Description(): string {
		return this._description;
	}

	get CurrentValue(): string {
		return this._currentValue;
	}

	get CustomOptions(): FabricQuickPickItem[] {
		return this._customOptions;
	}

	public async getValue(): Promise<string> {
		let selectedItem: FabricQuickPickItem = undefined;
		switch (this.InputType) {
			case "FREE_TEXT":
				return await FabricCommandBuilder.showInputBox(this.CurrentValue, this.Prompt, this.Description);
			case "WORKSPACE_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(FabricCommandBuilder.getQuickPickItems("Workspace"), this.Prompt, this.Description, this._currentValue);
				break;
			case "REPORT_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(FabricCommandBuilder.getQuickPickItems("Report"), this.Prompt, this.Description, this._currentValue);
				break;
			case "DATASET_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(FabricCommandBuilder.getQuickPickItems("SemanticModel"), this.Prompt, this.Description, this._currentValue);
				break;
			case "DATAFLOW_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(FabricCommandBuilder.getQuickPickItems("Dataflow"), this.Prompt, this.Description, this._currentValue);
				break;
			case "CAPACITY_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(FabricCommandBuilder.getQuickPickItems("Capacity"), this.Prompt, this.Description, this._currentValue);
				break;
			case "CUSTOM_SELECTOR":
				selectedItem = await FabricCommandBuilder.showQuickPick(this.CustomOptions, this.Prompt, this.Description, this._currentValue);
				break;
			default:
				return this.InputType;
		}
		return selectedItem?.value;
	}
}

