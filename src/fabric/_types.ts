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
	| "KQLDashboard"			//	A KQL dashboard.
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
	| "Eventhouse"
	| "Reflex"					//	Reflex item.

	// custom types
	| "GenericViewer"			//	A generic viewer item.

	| "Capacity"
	| "Dataflow"
	| "Workspace"
	| "Lakehouses"							//	Folder for Lakehouse item.
	| "SQLEndpoints"						//	Folder for SQLEndpoint item.
	| "Notebooks"							//	Folder for Notebook item.
	| "Environments"						//	Folder for Environment item.
	| "SemanticModels"						//	Folder for Semantic Model item.
	| "Reports"								//	Folder for Report item.
	| "SparkJobDefinitions"					//	Folder for Spark Job Definition item.
	| "Eventhouses"							//	Folder for Eventhouse item.
	| "KQLDatabases"						//	Folder for KQL Database item.
	| "KQLQuerysets"						//	Folder for KQL Queryset item.
	| "KQLDashboards"						//	Folder for KQL Dashboard item.
	| "Reflexes"							//	Folder for Reflex item.
	| "EventStreams" 						//	Folder for Eventstream item.
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
	| "ItemJobInstances"					//	Folder for item job instances.
	| "ItemJobInstance"						//	An Item job instance.
	| "ItemDataAccessRoles"					//	Folder for item data access roles.	
	| "ItemDataAccessRole"					//	An Item data access role.
	| "WorkspaceRoleAssignments"			//	Folder for workspace role assignments.
	| "WorkspaceRoleAssignment"				//	A workspace role assignment.
	| "MirroredDatabases"					//	Folder for mirrored databases.
	| "MirroredDatabase"					//	A mirrored database.
	| "MirroredDatabaseSynchronization"		//	A mirrored database synchronization.
	| "MirroredDatabaseTables"				//	Folder for mirrored database tables.
	| "MirroredDatabaseTable"				//	A mirrored database table.
	| "Gateway"
	| "Connection"
	| "GatewayMembers"						//	Folder for gateway members.
	| "GatewayMember"						//	A gateway member.
	| "GatewayRoleAssignments"				//	Folder for gateway role assignments.
	| "GatewayRoleAssignment"				//	A gateway role assignment.
	| "ConnectionRoleAssignments"			//	Folder for connection role assignments.
	| "ConnectionRoleAssignment"			//	A connection role assignment.
	| "SQLEndpointBatches"					//	Folder for sql endpoint batches.
	;

export enum FabricApiWorkspaceType {
	"Personal"		// A personal workspace
	, "Workspace"		// A collaborative workspace
};

export type FabricApiConnectionConnectivityType =
	"Automatic"	// The connection connects through the cloud using an implicit data connection. This option is only available for specific scenarios like semantic models that use Single Sign-On (SSO).”
	| "None"	// The connection is not bound
	| "OnPremisesGateway"	// The connection connects through an on-premises data gateway.
	| "OnPremisesGatewayPersonal"	// The connection connects through a personal on-premises data gateway.
	| "PersonalCloud"	// The connection connects through the cloud and cannot be shared with others.
	| "ShareableCloud"	// The connection connects through the cloud and can be shared with others.
	| "VirtualNetworkGateway"	// The connection connects through a virtual network data gateway.
	;

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
	state: "Active" | "Inactive";
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
	target: any; // The target of the shortcut.
}

export interface iFabricApiItemConnection {
	connectionDetails: {
		path: string; // The connection path.
		type: string; // The connection type.
	}; // The connection details of the connection.	
	connectivityType: FabricApiConnectionConnectivityType; // The connectivity type of the connection.	
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

export enum iFabricApiWorkspaceRoleAssignmentRole {
	"Admin",	// Enables administrative access to the workspace.
	"Contributor", // Enables contribution to the workspace.
	"Member", // Enables membership access to the workspace.
	"Viewer" // Enables viewing of the workspace.
}

export enum iFabricApiGatewayRoleAssignmentRole {
	"Admin", // Enables administrative access for the gateway.
	"ConnectionCreator", // Enables connection creator access for the gateway.
	"ConnectionCreatorWithResharing" // Enables connection creator with resharing access for the gateway.
}

export enum iFabricApiConnectionRoleAssignmentRole {
	"Owner", // Enables ownership access for the connection.
	"User", // Enables user access for the connection.
	"UserWithReshare" // Enables user with resharing access for the connection.
}

export interface iFabricApiGenericRoleAssignment {
	id: string; // The unique id for the role assignment.
	principal: {
		displayName: string; // The principal's display name.
		id: string; // The principal's ID.
		type: "User" | "Group" | "ServicePrincipal" | "ServicePrincipalProfile"; // The type of the principal. Additional principal types may be added over time.
		servicePrincipalDetails: {
			aadAppId: string; // The service principal ID of the principal.
		}; // Service principal specific details. Applicable when the principal type is ServicePrincipal.
		servicePrincipalProfileDetails: {
			parentPrincipal: object; // The service principal profile ID of the principal.
		}; // Service principal profile details. Applicable when the principal type is ServicePrincipalProfile.
		userDetails: {
			userPrincipalName: string; // The user principal name of the principal.
		}; // The user details of the principal.
		groupDetails: {
			groupType: string
		};
	}; // The principal object which contains the principal details.
	role: any; // The role of the role assignment.
}

export interface iFabricApiWorkspaceRoleAssignment extends iFabricApiGenericRoleAssignment {
	role: iFabricApiWorkspaceRoleAssignmentRole
};
export interface iFabricApiGatewayRoleAssignment extends iFabricApiGenericRoleAssignment {
	role: iFabricApiGatewayRoleAssignmentRole;
};

export interface iFabricApiConnectionRoleAssignment extends iFabricApiGenericRoleAssignment {
	role: iFabricApiConnectionRoleAssignmentRole;
};
export interface iFabricApiItemJobInstance {
	id: string; // Job instance Id.
	itemId: string; // Item Id.
	startTimeUtc: string; // Job start time in UTC.
	endTimeUtc: string; // Job end time in UTC.
	failureReason: any; // Error response when job is failed.

	invokeType: string; // The item job invoke type. Additional invokeTypes may be added over time.

	jobType: string; // Job type.
	rootActivityId: string; // Root activity id to trace requests across services.

	status: string; // The item job status. Additional statuses may be added over time.
}

export interface iFabricApiGateway {
	displayName: string; // The display name of the on-premises gateway.
	id: string; // The object ID of the gateway.
	numberOfMemberGateways: number; // The number of gateway members in the on-premises gateway.
	type: "OnPremises" | "OnPremisesPersonal" | "VirtualNetwork"; // The type of the gateway.
	
	// on-premises + personal gateway only
	publicKey: any; // The public key of the primary gateway member. Used to encrypt the credentials for creating and updating connections.
	version: string; // The version of the installed primary gateway member.

	// on-premises gateway only
	allowCloudConnectionRefresh: boolean; // Whether to allow cloud connections to refresh through this on-premises gateway. True - Allow, False - Do not allow.
	allowCustomConnectors: boolean; // Whether to allow custom connectors to be used with this on-premises gateway. True - Allow, False - Do not allow.
	loadBalancingSetting: any; // The load balancing setting of the on-premises gateway.
	

	// VNet Gateway only
	capacityId: string; // The object ID of the Fabric license capacity.
	inactivityMinutesBeforeSleep: number; // The minutes of inactivity before the virtual network gateway goes into auto-sleep.
	virtualNetworkAzureResource: any; // The Azure virtual network resource.
}

export interface iFabricApiGatewayMember {
	displayName: string; // The display name of the gateway member.
	enabled: boolean; // Whether the gateway member is enabled. True - Enabled, False - Not enabled.
	id: string; // The object ID of the gateway member.
	publicKey: any; // The public key of the gateway member. Used to encrypt the credentials for creating and updating connections.
	version: string; // The version of the gateway member.
}

// useless as of now as only the ObjectID is provided
export interface iFabricApiConnectionPermission {
	identifer: string;	// ObjectID
	role: "Owner" | "User" | "UserWithReshare";
	datasourceAccessRight: string; // only "Read" ?
	principalType: "User" | "Group"; // Service principals show up as users ?!?
}



export interface iFabricApiConnection {
	connectionDetails: {  // The connection details of the connection.
		path: string; // The path of the connection.
		type: string; // The type of the connection.
	};

	connectivityType: FabricApiConnectionConnectivityType; // The connectivity type of the connection.

	credentialDetails: { // The credential details of the connection.
		connectionEncryption: string; // The connection encryption setting that is used during the test connection.
		credentialType: string; // The credential type of the connection.
		singleSignOnType: string; // The single sign-on type of the connection.
		skipTestConnection: boolean; // Whether the connection should skip the test connection during creation and update. True - Skip the test connection, False - Do not skip the test connection.	
	};


	displayName: string; // The display name of the connection.
	gatewayId: string // The gateway object ID of the connection.
	id: string // The object ID of the connection.
	privacyLevel: string; // The privacy level of the connection.
}

export interface iFabricApiTableMirroringStatusResponse {
	error: iFabricErrorResponse; // Table level error is set if error happens in mirroring for this table
	metrics: {	// The mirroring metrics of table.
		lastSyncDateTime: string; // Last processed time of the table in in UTC, using the YYYY-MM-DDTHH:mm:ssZ format.
		processedBytes: number; // Processed bytes for this table.
		processedRows: number; // Processed row count for this table.
	};
	sourceSchemaName: string; // Source table schema name.
	sourceTableName: string; // Source table name.
	status: "Failed" | "Initialized" | "Replicating" | "Reseeding" | "Snapshotting" | "Stopped"; // The mirroring status type of table.
}