import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { iFabricApiRelationsResponse } from '../../../fabric/_types';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import type { FabricItem } from './FabricItem';
import { FabricItemRelationUpstream } from './FabricItemRelationUpstream';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemRelationsUpstream extends FabricWorkspaceGenericFolder {
	constructor(parent: FabricItem) {
		super(`${parent.id}/UpstreamRelations`, "Upstream Relations", "ItemUpstreamRelations", parent, "relations/upstream");
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	async getChildren(element?: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem[]> {
		if (element != null && element != undefined) {
			return element.getChildren();
		}

		if (this._children) {
			const children = this._children;
			this._children = undefined;
			return children;
		}

		try {
			const response = await FabricApiService.get<iFabricApiRelationsResponse>(
				`/v1/workspaces/${this.parent.workspaceId}/items/${this.parent.itemId}/relations/upstream`,
				{ beta: true }
			);

			if (response.error) {
				ThisExtension.Logger.logError(response.error.message);
				return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(response.error)];
			}

			const workspaceNames = new Map(response.success.workspaces.map(workspace => [workspace.id, workspace.displayName]));
			const relationTypesByItemId = new Map<string, string[]>();
			for (const relation of response.success.relations) {
				const relationTypes = relationTypesByItemId.get(relation.dependentOnItemId) ?? [];
				relationTypes.push(relation.relationType);
				relationTypesByItemId.set(relation.dependentOnItemId, relationTypes);
			}

			const children = response.success.items
				.filter(item => item.id !== this.parent.itemId)
				.map(item => new FabricItemRelationUpstream(
					item,
					this,
					workspaceNames.get(item.workspaceId),
					relationTypesByItemId.get(item.id) ?? []
				));

			Helper.sortArrayByProperty(children, "itemName");
			return children;
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "upstream relations");
			return [];
		}
	}
}
