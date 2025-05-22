import * as vscode from 'vscode';

import { FabricQuickPickItem } from './FabricQuickPickItem';
import { FabricCommandInput } from './FabricCommandInput';
import { ERROR_ITEM_ID, FabricApiTreeItem, NO_ITEMS_ITEM_ID } from '../treeviews/FabricApiTreeItem';
import { FabricApiItemType } from '../../fabric/_types';
import { FabricApiService } from '../../fabric/FabricApiService';
import { ThisExtension } from '../../ThisExtension';
import { Helper } from '@utils/Helper';
import { FabricMapper } from '../../fabric/FabricMapper';

export const NO_QP_ITEMS_ITEM_ID: string = "NO_ITEMS_LOADED";

export type ApiMethod =
	"GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "PATCH"
	;

export abstract class FabricCommandBuilder {
	private static _quickPickLists: Map<FabricApiItemType, FabricQuickPickItem[]>;
	private static _maxQuickPickListItems: number = 50;

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
	): Promise<FabricQuickPickItem> {

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
			matchOnDescription: true,
			matchOnDetail: true,
			/*,
			onDidSelectItem: item => window.showInformationMessage(`Focus ${++i}: ${item}`)
			*/
		});
		if (result == undefined || result == null) {
			return null;
		}
		else {
			return result;
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

	static getQuickPickList(itemType: FabricApiItemType): FabricQuickPickItem[] {
		if (this._quickPickLists == undefined) {
			ThisExtension.Logger.logInfo(`Initializing QuickPickList ...`);
			this._quickPickLists = new Map<FabricApiItemType, FabricQuickPickItem[]>();
		}

		if (!this._quickPickLists.has(itemType)) {
			ThisExtension.Logger.logInfo(`Adding item '${itemType}' to QuickPickLists ...`);
			this._quickPickLists.set(itemType, []);
		}

		return this._quickPickLists.get(itemType);
	}

	static pushQuickPickItem(item: FabricQuickPickItem): void {
		if(item.value == NO_ITEMS_ITEM_ID || item.value == ERROR_ITEM_ID) {
			ThisExtension.Logger.logDebug(`Item '${item.label}(${item.value})' is not added to QuickPickList '${item.itemType}'.`);
			return;
		}

		let qpList = this.getQuickPickList(item.itemType);

		// if the item already exists, pop it and add it to the top again
		let existingItemIndex = qpList.findIndex(x => x.value == item.value);
		if (existingItemIndex >= 0) {
			qpList.splice(existingItemIndex, 1);
		}

		ThisExtension.Logger.logDebug(`Adding item '${item.label}(${item.value})' to QuickPickList '${item.itemType}'.`);
		qpList.push(item);

		while (qpList.length > this._maxQuickPickListItems) {
			let removed = qpList.shift();
			ThisExtension.Logger.logDebug(`Removed item '${removed.label}(${removed.value})' from QuickPickList '${item.itemType}'.`);
		}
	}

	static pushQuickPickApiItem(item: FabricApiTreeItem): void {
		let newItem: FabricQuickPickItem = item.asQuickPickItem;

		this.pushQuickPickItem(newItem);
	}

	static getQuickPickItems(itemType: FabricApiItemType, showInofMessage: boolean = false): FabricQuickPickItem[] {
		let qpList = this.getQuickPickList(itemType);

		if (qpList.length == 0) {
			ThisExtension.Logger.logInfo(`QuickPickList '${itemType}' is empty!`);
			
			if (showInofMessage) {
				vscode.window.showInformationMessage(`No items found for '${itemType}'!`);
			}
			const plural = FabricMapper.getItemTypePlural(itemType);
			return [new FabricQuickPickItem(`No ${plural} found!`, NO_QP_ITEMS_ITEM_ID, NO_QP_ITEMS_ITEM_ID, "To populate this list, please navigate to/select the items in the treeview first.")];
		}
		
		return qpList;
	}
}

