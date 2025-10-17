import { FabricItem } from "../FabricItem";
import { FabricItemLivySessions } from "../FabricItemLivySessions";
import { FabricWorkspaceGenericFolder } from "../FabricWorkspaceGenericFolder";
import { FabricWorkspaceTreeItem } from "../FabricWorkspaceTreeItem";


export class FabricItemLivyMixin {

	id?: string;
	constructor(data: any) { }



	async getChildItemLivySessions(parent: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem> {
		return new FabricItemLivySessions(parent)
	}
}
