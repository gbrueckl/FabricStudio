import * as vscode from 'vscode';

import { FabricQuickPickItem } from './FabricQuickPickItem';
import { FabricCommandInput } from './FabricCommandInput';
import { FabricApiTreeItem } from '../treeviews/FabricApiTreeItem';
import { FabricApiItemType } from '../../fabric/_types';
import { FabricApiService } from '../../fabric/FabricApiService';
import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';

export type ApiMethod =
	"GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "PATCH"
	;

export abstract class FabricCommandBuilder {
	private static _quickPickLists: Map<FabricApiItemType, FabricQuickPickItem[]>;
	private static _maxQuickPickListItems: number = 10;

	static async execute<T>(
		apiUrl: string,
		method: ApiMethod = "POST",
		inputs: FabricCommandInput[] = []
	): Promise<T> {
		let body: object = {};

		let inputValue: string = null;
		for (let input of inputs) {
			inputValue = await input.getValue();

			body = this.addProperty(body, input.Key, inputValue);
		}

		switch (method) {
			case "GET":
				return FabricApiService.get(apiUrl, body) as Promise<T>;

			case "POST":
				return FabricApiService.post(apiUrl, body) as Promise<T>;

			case "PATCH":
				return FabricApiService.patch(apiUrl, body) as Promise<T>;

			case "DELETE":
				return FabricApiService.delete(apiUrl, body) as Promise<T>;

			default:
				break;
		}

	}

	static addProperty(body: object, key: string, inputValue: string): object {
		if (inputValue == null || inputValue == undefined) {
			return body;
		}
		let keys = key.split('.');

		// if we reached the last key, we assign the inputValue
		if (keys.length == 1) {
			body[keys[0]] = inputValue;
		}
		else {
			// add the key if it does not exist yet
			if (!(keys[0] in body)) {
				body[keys[0]] = {};
			}
			// recursivly add the existing keys
			body[keys[0]] = this.addProperty(body[keys[0]], keys.slice(1).join('.'), inputValue);
		}
		return body;
	}

	static async showQuickPick(
		items: FabricQuickPickItem[],
		title: string,
		description: string,
		currentValue: string
	): Promise<string> {

		const selectedItem = items.find(x => x.value == currentValue);
		if (selectedItem != undefined) {
			// this would only work if MultiSelect is enabled for the QuickPick which is not the case
			selectedItem.picked = true;
			// so we move the selected item to the top of the list
			items = [selectedItem].concat(items.filter(x => x.value != currentValue));
		}

		const result = await vscode.window.showQuickPick(items, {
			title: title + (description ? (" - " + description) : ""),
			placeHolder: currentValue,
			ignoreFocusOut: true,
			/*,
			onDidSelectItem: item => window.showInformationMessage(`Focus ${++i}: ${item}`)
			*/
		});
		if (result == undefined || result == null) {
			return null;
		}
		else {
			return result.value;
		}
	}

	static async showInputBox(
		defaultValue: string,
		title: string,
		description: string,
		valueSelection: [number, number] = undefined,
	): Promise<string> {
		const result = await vscode.window.showInputBox({
			title: title + (description ? (" - " + description) : ""),
			ignoreFocusOut: true,
			value: defaultValue,
			valueSelection: valueSelection,
			placeHolder: defaultValue,
			prompt: description
			/*,
			validateInput: text => {
				window.showInformationMessage(`Validating: ${text}`);
				return text === '123' ? 'Not 123!' : null;
			}*/
		});

		return result;
	}

	static pushQuickPickItem(item: FabricApiTreeItem): void {
		/* also support DATASET_XMLA
		if (item.itemType == "DATASET") {
			if (!this._quickPickLists.has("DATASET_XMLA")) {
				ThisExtension.Logger.logInfo(`Adding item 'DATASET_XMLA' to QuickPickLists ...`);
				this._quickPickLists.set("DATASET_XMLA", []);
			}
		}
		*/
		if (this._quickPickLists == undefined) {
			ThisExtension.Logger.logInfo(`Initializing QuickPickList ...`);
			this._quickPickLists = new Map<FabricApiItemType, FabricQuickPickItem[]>();
		}

		if (!this._quickPickLists.has(item.itemType)) {
			ThisExtension.Logger.logInfo(`Adding item '${item.itemType}' to QuickPickLists ...`);
			this._quickPickLists.set(item.itemType, []);
		}

		let newItem: FabricQuickPickItem = item.asQuickPickItem;

		// if the item already exists, pop it and add it to the top again
		let existingItemIndex = this._quickPickLists.get(item.itemType).findIndex(x => x.value == newItem.value);
		if (existingItemIndex >= 0) {
			this._quickPickLists.get(item.itemType).splice(existingItemIndex, 1);
		}

		ThisExtension.Logger.logDebug(`Adding item '${newItem.label}(${newItem.value})' to QuickPickList '${item.itemType}'.`);
		this._quickPickLists.get(item.itemType).push(newItem);

		while (this._quickPickLists.get(item.itemType).length > this._maxQuickPickListItems) {
			let removed = this._quickPickLists.get(item.itemType).shift();
			ThisExtension.Logger.logDebug(`Removed item '${removed.label}(${removed.value})' from QuickPickList '${item.itemType}'.`);
		}
	}

	static getQuickPickItems(itemType: FabricApiItemType): FabricQuickPickItem[] {
		if (this._quickPickLists == undefined) {
			ThisExtension.Logger.logInfo(`Initializing QuickPickList ...`);
			this._quickPickLists = new Map<FabricApiItemType, FabricQuickPickItem[]>();
		}

		if (!this._quickPickLists.has(itemType)) {
			ThisExtension.Logger.logInfo(`Adding item '${itemType}' to QuickPickLists ...`);
			this._quickPickLists.set(itemType, []);
			Helper.showTemporaryInformationMessage(`No items of type '${itemType}' found. Please navigate to them first.`, 4000);
			return [new FabricQuickPickItem("No items found!", "NO_ITEMS_FOUND", "NO_ITEMS_FOUND", "To populate this list, please navigate to/select the items in the browser first.")];
		}

		return this._quickPickLists.get(itemType);;
	}
}

