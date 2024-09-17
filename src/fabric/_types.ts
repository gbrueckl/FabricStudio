import { iGenericApiError } from "@utils/_types";
import { UniqueId } from "@utils/Helper";

// https://learn.microsoft.com/en-us/rest/api/fabric/core/items/get-item?tabs=HTTP#itemtype
export type FabricApiItemType =
	"Dashboard"					//	PowerBI dashboard.
	| "DataPipeline"			//	A data pipeline.
	| "Datamart"				//	PowerBI datamart.
	| "Environment"				//	An environment item.
	| "Eventstream"				//	An eventstream item.
	| "KQLDataConnection"		//	A KQL data connection.
	| "KQLDatabase"				//	A KQL database.
	| "KQLQueryset"				//	A KQL queryset.
	| "Lakehouse"				//	Lakehouse item.
	| "MLExperiment"			//	A machine learning experiment.
	| "MLModel"					//	A machine learning model.
	| "MountedWarehouse"		//	A MountedWarehouse item.
	| "Notebook"				//	A notebook.
	| "PaginatedReport"			//	PowerBI paginated report.
	| "Report"					//	PowerBI report.
	| "SQLEndpoint"				//	An SQL endpoint.
	| "SemanticModel"			//	PowerBI semantic model.
	| "SparkJobDefinition"		//	A spark job definition.
	| "Warehouse"				//	A warehouse item.
	| "DeploymentPipeline"		//	A deployment pipeline.

	// custom types
	| "GenericViewer"			//	A generic viewer item.

	| "Capacity"
	| "Dataflow"
	| "Workspace"
	| "Lakehouses"							//	Folder for Lakehouse item.
	| "Environments"						//	Folder for Environment item.
	| "LakehouseTable"						//	Lakehouse Table
	| "LakehouseTables"						//	Folder for Lakehouse Table item.
	| "GraphQLApi"							//	GraphQL API item.
	| "GraphQLApis"							//	Folder for GraphQL API items.
	| "DataPipelines"						//	Folder for DataPipeline item.
	| "DeploymentPipelineStage"				//	A Deployment pipleine stage
	| "DeploymentPipelineStages"			//	Folder for Deployment pipleine stages.
	| "GenericItem"
	| "ItemShortcuts"						//	Folder for item shortcuts.
	| "ItemShortcut"						//	An Item shortcut.
	| "ItemConnections"						//	Folder for item connections.
	| "ItemConnection" 						//	An Item connection.
	| "ItemDataAccessRoles"					//	Folder for item data access roles.	
	| "ItemDataAccessRole"					//	An Item data access role.
	;

export type FabricApiItemTypeWithDefinition =
	"DataPipelines"			//	A data pipeline.
	| "Notebooks"				//	A notebook.
	| "Reports"				//	PowerBI report.
	| "SemanticModels"			//	PowerBI semantic model.
	| "SparkJobDefinitions"	//	A spark job definition.
	;

export enum FabricApiWorkspaceType {
	"Personal"		// A personal workspace
	, "Workspace"		// A collaborative workspace
};

export enum FabricApiItemConnectionType {
	"Automatic" 				//The connection connects through the cloud using an implicit data connection. This option is only available for specific scenarios like semantic models that use Single Sign-On (SSO).”
	, "None" 					//The connection is not bound
	, "OnPremisesGateway" 		// The connection connects through an on-premises data gateway.
	, "OnPremisesGatewayPersonal" // The connection connects through a personal on-premises data gateway.
	, "PersonalCloud" 			// 	The connection connects through the cloud and cannot be shared with others.
	, "ShareableCloud" 			// The connection connects through the cloud and can be shared with others.
	, "VirtualNetworkGateway" 	//	The connection connects through a virtual network data gateway.
};

export enum FabricApiItemFormat {
	DEFAULT = "DEFAULT"
	, Notebook = "ipynb"
	, SparkJobDefinitionV1 = "SparkJobDefinitionV1"
}


// https://learn.microsoft.com/en-us/rest/api/fabric/core/items/get-item?tabs=HTTP#item
export interface iFabricApiItem {
	displayName: string;
	description?: string;
	type: FabricApiItemType;
	workspaceId?: UniqueId;
	id?: string;
}

export interface iFabricApiWorkspace {
	id: string;
	displayName: string;
	description?: string;
	type: string;
	capacityId: string;
	capacityAssignmentProgress: string;
}

export interface iFabricApiLakehouseProperties {
	oneLakeTablesPath: string;
	oneLakeFilesPath: string;
	sqlEndpointProperties: {
		id: UniqueId
		connectionString: string;
		provisioningStatus: string;
	}
}

export interface iFabricApiLakehouseTable {
	format: string		// Table format.
	location: string	// Table location.	
	name: string		// Table name.
	type: string		//Table type.
}

export interface iFabricApiCapacity {
	id: string;
	displayName: string;
	state: string;
	sku: string;
	region: string;
}



export type FabricApiPayloadType = "InlineBase64" | "VSCodeFolder";

export interface iFabricListResponse<T> {
	value: T[];
	continuationToken?: string;
	continuationUri?: string;
}
export interface iFabricApiItemPart {
	path: string;
	payload: string;
	payloadType: FabricApiPayloadType;
}

export interface iFabricApiItemDefinition {
	definition: {
		format?: FabricApiItemFormat;
		parts: iFabricApiItemPart[];
	}
}

export interface iFabricPollingResponse {
	status: "Running" | "Failed" | "Succeeded";
	createdTimeUtc: Date;
	lastUpdatedTimeUtc: Date;
	percentComplete: number;
	error: any;
}

export interface iFabricErrorRelatedResource {
	resourceId: string;  	// The resource ID that's involved in the error.
	resourceType: string; 	// The type of the resource that's involved in the error.
}
export interface iFabricErrorResponseDetails {
	errorCode: string; 	// A specific identifier that provides information about an error condition, allowing for standardized communication between our service and its users.
	message: string; 	// A human readable representation of the error.
	relatedResource: iFabricErrorRelatedResource; //The error related resource details.
}
export interface iFabricErrorResponse extends iGenericApiError {
	errorCode: string; 	// A specific identifier that provides information about an error condition, allowing for standardized communication between our service and its users.
	message: string; 	// human readable representation of the error.
	moreDetails?: iFabricErrorResponseDetails[] 		// List of additional error details.
	relatedResource?: iFabricErrorRelatedResource 	// The error related resource details.
	requestId?: string 	// ID of the request associated with the error.
}

export interface iFabricApiResponse<TSucces = any, TError = iFabricErrorResponse> {
	success?: TSucces;
	error?: TError;
}

export interface iFabricApiGitItemIdentifier {
	logicalId?: string;  //The logical ID of the item. When the logical ID isn't available because the item is not yet added to the workspace, you can use the object ID.
	objectId?: UniqueId;  //The object ID of the item. When the object ID isn't available because the item was deleted from the workspace, you can use the logical ID.
}

export type iFabricApiGitItemChangeType = "Added" | "Modified" | "Deleted";

export interface iFabricApiGitItemChange {
	conflictType: "Conflict" | "None" | "SameChanges"; 	//When there are changes on both the workspace side and the remote Git side.
	itemMetadata: {
		displayName: string; //The display name of the item. Prefers the workspace item's display name if it exists, otherwise displayName uses the remote item's display name.
		itemIdentifier: iFabricApiGitItemIdentifier;
		itemType: FabricApiItemType; 	//The item type.
	}; 	//The item metadata.
	remoteChange: iFabricApiGitItemChangeType; 	//Change on the remote Git side.
	workspaceChange: iFabricApiGitItemChangeType; //Change on the workspace side.
}

export interface iFabricApiGitStatusResponse {
	workspaceHead: string;
	remoteCommitHash: string;
	changes: iFabricApiGitItemChange[];
}


export interface iFabricApiDeploymentPipelineStage {
	description: string; // The deployment pipeline stage description.
	displayName: string; // The deployment pipeline stage display name.
	id: string; // The deployment pipeline stage ID.
	isPublic: boolean; // Indicates whether the deployment pipeline stage is public. True - the stage is public, False - the stage isn't public.
	order: number; // The stage order, starting from zero.
	workspaceId?: string; // The assigned workspace ID. Only applicable when there's an assigned workspace.
	workspaceName?: string; // The assigned workspace name. Only applicable when there's an assigned workspace and the user has access to the workspace.
}


export interface iFabricApiDeploymentPipelineStageItem {
	itemDisplayName: string; // The Fabric item display name.
	itemId: string; // The Fabric item ID.
	itemType: FabricApiItemType; // The Fabric item type.
	lastDeploymentTime: string; // The last deployment date and time of the Fabric item.
	sourceItemId: string; // The ID of the Fabric item from the workspace assigned to the source stage, which will update the current Fabric item upon deployment. Applicable only when the user has at least contributor access to the source stage workspace.
	targetItemId: string; // The ID of the Fabric item from the workspace of the target stage, which will be updated by the current Fabric item upon deployment. Applicable only when the user has at least contributor access to the target stage workspace.
}

export interface iFabricApiItemShortcut {
	path: string; // The path of the shortcut.
	name: string; // The name of the shortcut.
	target: object; // The target of the shortcut.
}

export interface iFabricApiItemConnection {
	connectionDetails: {
		path: string; // The connection path.
		type: string; // The connection type.
	}; // The connection details of the connection.	
	connectivityType: FabricApiItemConnectionType; // The connectivity type of the connection.	
	displayName: string; // The display name of the connection. Maximum length is 200 characters.
	gatewayId: string; // The gateway object ID of the connection.	
	id: string; // The object ID of the connection.
}

export interface iFabricApiItemDataAccessRole {
	id: string; // The unique id for the Data access role.
	name: string; // The name of the Data access role.
	decisionRules: any[]; // The array of permissions that make up the Data access role.	

	members: {
		fabricItemMembers: any[]; // The array of role ids that are members of the Data access role.	
		microsoftEntraMembers: any[]; // The array of user ids that are members of the Data access role.	
	}; // The members object which contains the members of the role as arrays of different member types.

}