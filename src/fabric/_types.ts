import { iGenericApiError, iGenericApiResponse } from "@utils/_types";
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
	| "MountedDataFactory" 		//	A MountedDataFactory item.


	// custom types
	| "GenericViewer"			//	A generic viewer item.
	| "WorkspaceFolder"			//	A workspace folder.


	| "Capacity"
	| "Dataflow"
	| "Workspace"
	| "Lakehouses"							//	Folder for Lakehouse item.
	| "SQLEndpoints"						//	Folder for SQLEndpoint item.
	| "Notebooks"							//	Folder for Notebook item.
	| "Environments"						//	Folder for Environment item.
	| "SemanticModels"						//	Folder for Semantic Model item.
	| "Reports"								//	Folder for Report item.
	| "MountedDataFactories" 				//	Folder for MountedDataFactory item.
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
	| "CopyJob"								//	A copy job item.
	| "CopyJobs"							//	Folder for copy job items.
	| "GenericItem"
	| "ItemShortcuts"						//	Folder for item shortcuts.
	| "ItemShortcut"						//	An Item shortcut.
	| "ItemConnections"						//	Folder for item connections.
	| "ItemConnection" 						//	An Item connection.
	| "ItemJobInstances"					//	Folder for item job instances.
	| "ItemJobInstance"						//	An Item job instance.
	| "ItemJobSchedules"					//	Folder for item job schedules.
	| "ItemJobSchedule"						//	An Item job schedule.
	| "ItemDataAccessRoles"					//	Folder for item data access roles.	
	| "ItemDataAccessRole"					//	An Item data access role.
	| "ItemDefinition"						//	An Item definition.	
	| "ItemDefinitionFile"					//	An Item definition file.
	| "ItemDefinitionFolder"				//	Folder for item definition files.
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
	| "WorkspaceManagedPrivateEndpoints"	//	Folder for workspace managed private endpoints.
	| "WorkspaceManagedPrivateEndpoint"		//	A workspace managed private endpoint.
	| "AdminTenantSettings"					//	Folder for admin tenant settings.
	| "AdminTenantSetting"					//	An admin tenant setting.
	| "AdminDomains"						//	Folder for admin domains.
	| "AdminDomain"							//	An admin domain.
	| "AdminDomainWorkspaces"				//	Folder for admin domain workspaces.
	| "AdminDomainWorkspace"				//	An admin domain workspace.
	| "AdminTags"							//	Folder for admin tags.
	| "AdminTag"							//	An admin tag.
	| "MirroredAzureDatabricksCatalogs"		//	Folder for mirrored Azure Databricks catalogs.
	| "MirroredAzureDatabricksCatalog"		//	A mirrored Azure Databricks catalog.
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
	folderId?: UniqueId;
}

export interface iFabricApiWorkspace {
	id: string;
	displayName: string;
	description?: string;
	type: string;
	capacityId: string;
	capacityAssignmentProgress: string;
}

export interface iFabricApiWorkspaceFolder {
	id: UniqueId;
	displayName: string;
	workspaceId: UniqueId;
	parentFolderId?: UniqueId;
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

export interface iFabricApiLakehouse extends iFabricApiItem {
	properties: iFabricApiLakehouseProperties;
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
	moreDetails?: iFabricErrorResponseDetails[] 		// List of additional error details.
	relatedResource?: iFabricErrorRelatedResource 	// The error related resource details.
}

export interface iFabricApiResponse<TSucces = any, TError = iFabricErrorResponse> extends iGenericApiResponse<TSucces, TError> {
	success?: TSucces;
	error?: TError;
	responseHeaders?: { [key: string]: string }; 
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

export interface iFabricApiGenericPrincipal {
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
}

export interface iFabricApiGenericRoleAssignment {
	id: string; // The unique id for the role assignment.
	principal: iFabricApiGenericPrincipal; // The principal object which contains the principal details.
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

export interface iFabricApiItemJobSchedule {
	configuration: any; // The actual data contains the time/weekdays of this schedule.
	createdDateTime: string; // The created time stamp of this schedule in Utc.
	enabled: boolean; // Whether this schedule is enabled. True - Enabled, False - Disabled.
	id: string; // The schedule ID.
	owner: iFabricApiGenericPrincipal; // The user identity that created this schedule or last modified.
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

export interface iFabricApiWorkspaceManagedPrivateEndpoint {
	connectionState: object; // Endpoint connection state of provisioned endpoints.
	id: string; // Managed private endpoint Id.
	name: string; // The private endpoint name.
	provisioningState: string; // Provisioning state of endpoint.
	targetPrivateLinkResourceId: string; // Resource Id of data source for which private endpoint is created
	targetSubresourceType: string; // Sub-resource pointing to Private-link resoure.
}

export interface iFabricApiTenantSettingSecuritygroup {
	graphId: string; // The graph ID of the security group.
	name: string; // The name of the security group.
}

export enum iFabricApiTenantSettingPropertyType {
	Boolean = "Boolean", // A checkbox in the UI
	FreeText = "FreeText", // UI accepts any string for the text box
	Integer = "Integer", // UI accepts only integers for the text box
	MailEnabledSecurityGroup = "MailEnabledSecurityGroup", // UI accepts only email enabled security groups for the text box
	Url = "Url", // UI accepts only URLs for the text box
}
export interface iFabricApiTenantSettingProperties {
	name: string; // The name of the property.
	type: iFabricApiTenantSettingPropertyType; // The type of the property.
	value: string; // The value of the property.
}

export interface iFabricApiAdminTenantSetting {
	canSpecifySecurityGroups: boolean; // Indicates if the tenant setting can be enabled for security groups. False - The tenant setting cannot be enabled for security groups. True - The tenant setting can be enabled for security groups.
	delegateToCapacity: boolean; // Indicates whether the tenant setting can be delegated to a capacity admin. False - Capacity admin cannot override the tenant setting. True - Capacity admin can override the tenant setting.
	delegateToDomain: boolean; // Indicates whether the tenant setting can be delegated to a domain admin. False - Domain admin cannot override the tenant setting. True - Domain admin can override the tenant setting.
	delegateToWorkspace: boolean; // Indicates whether the tenant setting can be delegated to a workspace admin. False - Workspace admin cannot override the tenant setting. True - Workspace admin can override the tenant setting.
	enabled: boolean; // The status of the tenant setting. False - Disabled, True - Enabled.
	enabledSecurityGroups: iFabricApiTenantSettingSecuritygroup[]; // A list of enabled security groups.
	excludedSecurityGroups: iFabricApiTenantSettingSecuritygroup[]; // A list of excluded security groups.
	properties: iFabricApiTenantSettingProperties[]; // Tenant setting properties.
	settingName: string; // The name of the tenant setting.
	tenantSettingGroup: string; // Tenant setting group name.
	title: string; // The title of the tenant setting.
}

export interface iFabricApiAdminDomain {
	id: string; // The domain ID.
	displayName: string; // The domain display name.
	description?: string; // The domain description.
	parentDomainId?: string; // The parent domain ID.
	contributorsScope: "AllInTheTenant" | "SpecificUsersAndGroups"; // The contributors scope for the domain.
}

export interface iFabricApiAdminDomainWorkspace {
	id: string; // The workspace ID.
	displayName: string; // The workspace display name.
}

export interface iFabricApiAdminTag {
	id: string; // The tag ID.
	displayName: string; // The tag display name.
}

export interface iFabricPlatformFile {
	$schema: string;
	metadata: {
		type: FabricApiItemType;
		displayName: string;
	},
	config: {
		version: string;
		logicalId: string;
	}
}
