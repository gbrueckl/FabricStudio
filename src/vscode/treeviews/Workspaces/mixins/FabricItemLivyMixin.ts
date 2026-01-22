import { ThisExtension } from "../../../../ThisExtension";
import { FabricItem } from "../FabricItem";
import { FabricItemLivySessions } from "../FabricItemLivySessions";
import { FabricWorkspaceGenericFolder } from "../FabricWorkspaceGenericFolder";
import { FabricWorkspaceTreeItem } from "../FabricWorkspaceTreeItem";


export class FabricItemLivyMixin {

	id?: string;
	constructor(data: any) {
		ThisExtension.Logger.logInfo(`FabricItemLivyMixin constructor called with data: ${JSON.stringify(data)}`);
	}



	async getChildItemLivySessions(parent: FabricWorkspaceTreeItem): Promise<FabricWorkspaceTreeItem> {
		return new FabricItemLivySessions(parent)
	}
}
