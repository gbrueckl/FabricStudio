import { FabricApiItemType } from "../../../fabric/_types";

export interface iFabricApiPipelineDeployableItem {
	itemType: FabricApiItemType,
	sourceItemId: string
}

export interface iFabricPipelineDeployableItem {
	getDeployableItems(): Promise<iFabricApiPipelineDeployableItem[]>;
}