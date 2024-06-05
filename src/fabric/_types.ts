import { iGenericApiError } from "@utils/_types";
import { UniqueId } from "@utils/Helper";

// https://learn.microsoft.com/en-us/rest/api/fabric/core/items/get-item?tabs=HTTP#itemtype
export type FabricApiItemType =
	"Dashboard"				//	PowerBI dashboard.
	| "DataPipeline"			//	A data pipeline.
	| "Datamart"				//	PowerBI datamart.
	| "Eventstream"			//	An eventstream item.
	| "KQLDataConnection"		//	A KQL data connection.
	| "KQLDatabase"			//	A KQL database.
	| "KQLQueryset"			//	A KQL queryset.
	| "Lakehouse"				//	Lakehouse item.
	| "MLExperiment"			//	A machine learning experiment.
	| "MLModel"				//	A machine learning model.
	| "MountedWarehouse"		//	A MountedWarehouse item.
	| "Notebook"				//	A notebook.
	| "PaginatedReport"		//	PowerBI paginated report.
	| "Report"				//	PowerBI report.
	| "SQLEndpoint"			//	An SQL endpoint.
	| "SemanticModel"			//	PowerBI semantic model.
	| "SparkJobDefinition"	//	A spark job definition.
	| "Warehouse"				//	A warehouse item.

	// custom types
	| "Capacity"
	| "Dataflow"
	| "Workspace"
	| "Lakehouses"					//	Folder for Lakehouse item.
	| "LakehouseTable"				//	Lakehouse Table
	| "LakehouseTables"				//	Folder for Lakehouse Table item.
	| "DataPipelines"				//	Folder for DataPipeline item.
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

export interface iFabricApiGitItemChange {
	conflictType: "Conflict" | "None" | "SameChanges"; 	//When there are changes on both the workspace side and the remote Git side.
	itemMetadata: {
		displayName: string; //The display name of the item. Prefers the workspace item's display name if it exists, otherwise displayName uses the remote item's display name.
		itemIdentifier: iFabricApiGitItemIdentifier;
		itemType: FabricApiItemType; 	//The item type.
	}; 	//The item metadata.
	remoteChange: string; 	//Change on the remote Git side.
	workspaceChange: string; //Change on the workspace side.
}

export interface iFabricApiGitStatusResponse {
	workspaceHead: string;
	remoteCommitHash: string;
	changes: iFabricApiGitItemChange[];
}