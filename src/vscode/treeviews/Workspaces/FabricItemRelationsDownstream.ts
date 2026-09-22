import { Helper } from '@utils/Helper';

import { ThisExtension } from '../../../ThisExtension';
import { FabricApiService } from '../../../fabric/FabricApiService';
import { iFabricApiRelationsResponse } from '../../../fabric/_types';
import { FabricWorkspaceGenericFolder } from './FabricWorkspaceGenericFolder';
import { FabricWorkspaceTreeItem } from './FabricWorkspaceTreeItem';
import type { FabricItem } from './FabricItem';
import { FabricItemRelationDownstream } from './FabricItemRelationDownstream';

// https://vshaxe.github.io/vscode-extern/vscode/TreeItem.html
export class FabricItemRelationsDownstream extends FabricWorkspaceGenericFolder {
	constructor(parent: FabricItem) {
		super(`${parent.id}/DownstreamRelations`, "Downstream Relations", "ItemDownstreamRelations", parent, "relations/downstream");
	}

	get parent(): FabricItem {
		return this._parent as FabricItem;
	}

	// Relation responses are retained until the owning item is refreshed.
	get refreshApiPaths(): string[] {
		return [];
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
				`/v1/workspaces/${this.parent.workspaceId}/items/${this.parent.itemId}/relations/downstream`,
				{ beta: true }
			);

			if (response.error) {
				ThisExtension.Logger.logError(response.error.message);
				return [FabricWorkspaceTreeItem.ERROR_ITEM<FabricWorkspaceTreeItem>(response.error)];
			}

			return this.createRelationTree(response.success);
		}
		catch (e) {
			Helper.handleGetChildrenError(e, this.parent, "downstream relations");
			return [];
		}
	}

	private createRelationTree(response: iFabricApiRelationsResponse): FabricWorkspaceTreeItem[] {
		const itemsById = new Map(response.items.filter(item => item.id).map(item => [item.id, item]));
		const workspaceNames = new Map(response.workspaces.map(workspace => [workspace.id, workspace.displayName]));
		const relationsByParentId = new Map<string, typeof response.relations>();

		for (const relation of response.relations) {
			const relations = relationsByParentId.get(relation.dependentOnItemId) ?? [];
			relations.push(relation);
			relationsByParentId.set(relation.dependentOnItemId, relations);
		}

		const createChildren = (parentId: string, parent: FabricWorkspaceTreeItem, ancestors: Set<string>): FabricItemRelationDownstream[] => {
			const children: FabricItemRelationDownstream[] = [];
			const relationTypesByChildId = new Map<string, string[]>();
			for (const relation of relationsByParentId.get(parentId) ?? []) {
				const types = relationTypesByChildId.get(relation.itemId) ?? [];
				types.push(relation.relationType);
				relationTypesByChildId.set(relation.itemId, types);
			}
			for (const [childId, relationTypes] of relationTypesByChildId) {
				const item = itemsById.get(childId);
				if (!item || ancestors.has(childId)) continue;

				const childAncestors = new Set(ancestors).add(childId);
				const child = new FabricItemRelationDownstream(item, parent, workspaceNames.get(item.workspaceId), relationTypes);
				child.setChildren(createChildren(childId, child, childAncestors));
				children.push(child);
			}
			Helper.sortArrayByProperty(children, "itemName");
			return children;
		};

		return createChildren(this.parent.itemId.toString(), this, new Set([this.parent.itemId.toString()]));
	}
}
