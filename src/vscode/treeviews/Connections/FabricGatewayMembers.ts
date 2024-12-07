import * as vscode from 'vscode';

import {  UniqueId } from '@utils/Helper';

import { iFabricApiGatewayMember } from '../../../fabric/_types';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { FabricConnectionGenericFolder } from './FabricConnectionGenericFolder';
import { FabricGateway } from './FabricGateway';
import { FabricConnectionTreeItem } from './FabricConnectionTreeItem';
import { FabricGatewayMember } from './FabricGatewayMember';


// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricGatewayMembers extends FabricConnectionGenericFolder {
	private _pipelineId: UniqueId;

	constructor(
		parent: FabricGateway
	) {
		super(`${parent.id}/members`, "Members", "GatewayMembers", parent, "members");
	}

	async getChildren(element?: FabricConnectionTreeItem): Promise<FabricConnectionTreeItem[]> {
		if(!FabricApiService.isInitialized) { 			
			return Promise.resolve([]);
		}

		if (element != null && element != undefined) {
			return element.getChildren();
		}
		else {
			let children: FabricGatewayMember[] = [];
			let items = await FabricApiService.getList<iFabricApiGatewayMember>(this.apiPath, undefined, "value", "order");

			for (let item of items.success) {
				let treeItem = new FabricGatewayMember(item, this);
				children.push(treeItem);
			}
			
			return children;
		}
	}
}