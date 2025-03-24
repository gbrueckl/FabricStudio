import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { FabricApiItemFormat, FabricApiItemType } from '../../fabric/_types';

/*
CLOUD_CONFIGS are mainly derived from here:
POST https://api.powerbi.com/powerbi/globalservice/v201606/environments/discover?client=powerbi-msolap
$x = Invoke-WebRequest -method POST -uri 'https://api.powerbi.com/powerbi/globalservice/v201606/environments/discover?client=powerbi-msolap'
Write-host $x
*/

interface iCloudConfig {
	friendlyName: string;
	authenticationEndpoint: string;
	authenticationProvider: string;
	apiEndpoint: string;
	resourceId: string;
	allowedDomains: string[];
}

const CLOUD_CONFIGS: { [key: string]: iCloudConfig } = {
	"GlobalCloud": {
		"friendlyName": "Public Azure Cloud",
		"authenticationProvider": "microsoft",
		"authenticationEndpoint": undefined,
		"apiEndpoint": "https://api.powerbi.com",
		"resourceId": "https://analysis.windows.net/powerbi/api",
		"allowedDomains": ["*.analysis.windows.net"]
	},
	"ChinaCloud": {
		"friendlyName": "China Cloud",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.chinacloudapi.cn/common",
		"apiEndpoint": "https://api.powerbi.cn",
		"resourceId": "https://analysis.chinacloudapi.cn/powerbi/api",
		"allowedDomains": ["*.analysis.chinacloudapi.cn"]
	},
	"GermanyCloud": {
		"friendlyName": "Germay Cloud",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.microsoftonline.de/common",
		"apiEndpoint": "https://api.powerbi.de",
		"resourceId": "https://analysis.cloudapi.de/powerbi/api",
		"allowedDomains": ["*.analysis.cloudapi.de"]
	},
	"USGovCloud": {
		"friendlyName": "US Government Community Cloud (GCC)",
		"authenticationProvider": "microsoft",
		"authenticationEndpoint": "https://login.windows.net/common",
		"apiEndpoint": "https://api.powerbigov.us",
		"resourceId": "https://analysis.usgovcloudapi.net/powerbi/api",
		"allowedDomains": ["*.analysis.usgovcloudapi.net"]
	},
	"USGovDoDL4Cloud": {
		"friendlyName": "US Government Community Cloud High (GCC High)",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.microsoftonline.us/common",
		"apiEndpoint": "https://api.high.powerbigov.us",
		"resourceId": "https://high.analysis.usgovcloudapi.net/powerbi/api",
		"allowedDomains": ["*.high.analysis.usgovcloudapi.net"]
	},
	"USGovDoDL5Cloud": {
		"friendlyName": "US Government DoD",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.microsoftonline.us/common",
		"apiEndpoint": "https://api.mil.powerbigov.us",
		"resourceId": "https://mil.analysis.usgovcloudapi.net/powerbi/api",
		"allowedDomains": ["*.mil.analysis.usgovcloudapi.net"]
	},
	"USNatCloud": {
		"friendlyName": "US Government Top Secret",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.microsoftonline.eaglex.ic.gov/common",
		"apiEndpoint": "https://api.powerbi.eaglex.ic.gov",
		"resourceId": "https://analysis.eaglex.ic.gov/powerbi/api/common",
		"allowedDomains": ["*.analysis.eaglex.ic.gov"]
	},
	"USSecCloud": {
		"friendlyName": "US Government Secret",
		"authenticationProvider": "microsoft-sovereign-cloud",
		"authenticationEndpoint": "https://login.microsoftonline.eaglex.ic.gov/common",
		"apiEndpoint": "https://api.powerbi.microsoft.scloud",
		"resourceId": "https://analysis.microsoft.scloud/powerbi/api",
		"allowedDomains": ["*.analysis.microsoft.scloud"]
	}
}

// known list of Item Typs which support the Definition APIs
// used to show/hide the "Edit Definitions" command and drive subfolders of the Fabric file system provider
// export const TYPES_WITH_DEFINITION: FabricApiItemType[] = [
// 	"DataPipelines",
// 	"Notebooks",
// 	"Reports",
// 	"SemanticModels",
// 	"SparkJobDefinitions",
// 	"MirroredDatabases",
// 	"Eventhouses",
// 	"KQLDatabases",
// 	"KQLQuerysets",
// 	"KQLDashboards",
// 	"Reflexes",
// ];

export const ITEM_FILE_NAMES: Map<FabricApiItemType, string> = new Map([
	["DataPipelines", "pipeline-content"],
	["Notebooks", "notebook-content"],
	["SparkJobDefinitions", "SparkJobDefinitionV1"],
	["MirroredDatabases", "mirroring"],
	["Eventhouses", "EventhouseProperties"],
	["KQLDatabases", "DatabaseProperties"],
	["KQLQuerysets", "RealTimeQueryset"],
	["KQLDashboards", "RealTimeDashboard"],
	["Reflexes", "ReflexEntities"],
	["EventStreams", "eventstream"],
	["MountedDataFactories", "mountedDataFactory-content"]
]);

// as we get it from the Config
interface iItemTypeFormatConfig {
	itemType: string;
	format: string;
	publishOnSave: boolean;
	compactView: boolean;
	useItemNameAsFileName: boolean;
}

// as we use it internally
interface iItemTypeFormat {
	itemType: FabricApiItemType;
	format: FabricApiItemFormat;
	publishOnSave: boolean;
	compactView: boolean;
	useItemNameAsFileName: boolean;
}

export abstract class FabricConfiguration {
	static get logLevel(): vscode.LogLevel { return this.getValue("logLevel"); }

	static get itemTypesWithDefinition(): FabricApiItemType[] {
		return ThisExtension.configuration.packageJSON.contributes.configuration[0].properties["fabricStudio.itemTypeFormats"].items.properties.itemType.enum;
	}

	static itemTypeHasDefinition(itemType: FabricApiItemType): boolean {
		const enumFromConfig = this.itemTypesWithDefinition;

		return enumFromConfig.includes(itemType);
	}

	static itemTypeFromString(itemType: string): FabricApiItemType {
		if (!itemType) {
			return undefined;
		}

		let ret: FabricApiItemType = itemType as FabricApiItemType;

		if (!FabricConfiguration.itemTypeHasDefinition(ret)) {
			let itemTypeCase = FabricConfiguration.itemTypesWithDefinition.find((type) => type.toLowerCase() == itemType.toLowerCase());
			if (itemTypeCase) {
				ret = itemTypeCase;
			}
			else {
				ThisExtension.Logger.logError(`Item type '${itemType}' is not a valid Fabric item type!`);
				return undefined;
			}
		}

		return ret;
	}

	static get cloud(): string {
		return "GlobalCloud";
		return this.getValue("cloud");
	}
	//static set cloud(value: string) { this.setValue("cloud", value); }

	static get tenantId(): string { return this.getValue("tenantId"); }
	static set tenantId(value: string) { this.setValue("tenantId", value); }

	static get clientId(): string { return this.getValue("clientId"); }
	static set clientId(value: string) { this.setValue("clientId", value); }

	static get showProWorkspaces(): string { return this.getValue("showProWorkspaces"); }
	static set showProWorkspaces(value: string) { this.setValue("showProWorkspaces", value); }

	static get workspaceFilter(): string { return this.getValue("workspaceFilter"); }
	static set workspaceFilter(value: string) { this.setValue("workspaceFilter", value); }
	static get workspaceFilterRegEx(): RegExp { return new RegExp(this.getValue("workspaceFilter")); }

	static get connectionFilter(): string { return this.getValue("connectionFilter"); }
	static set connectionFilter(value: string) { this.setValue("connectionFilter", value); }
	static get connectionFilterRegEx(): RegExp { return new RegExp(this.getValue("connectionFilter")); }

	static get capacityFilter(): string { return this.getValue("capacityFilter"); }
	static set capacityFilter(value: string) { this.setValue("capacityFilter", value); }
	static get capacityFilterRegEx(): RegExp { return new RegExp(this.getValue("capacityFilter"), "i"); }

	static get adminFilter(): string { return this.getValue("adminFilter"); }
	static set adminFilter(value: string) { this.setValue("adminFilter", value); }
	static get adminFilterRegEx(): RegExp { return new RegExp(this.getValue("adminFilter"), "i"); }

	static get itemTypeFormats(): iItemTypeFormat[] {
		let confValues = this.getValue("itemTypeFormats") as iItemTypeFormatConfig[];

		let typedValues = confValues.map((item) => {
			return {
				itemType: item.itemType as FabricApiItemType, // loose cast
				format: item.format as FabricApiItemFormat, // loose cast
				publishOnSave: item.publishOnSave,
				compactView: item.compactView,
				useItemNameAsFileName: item.useItemNameAsFileName,
			};
		});

		return typedValues;
	}
	static get itemTypes(): FabricApiItemType[] {
		return this.itemTypeFormats.map((item) => item.itemType);
	}

	static getFabricItemTypeFormat(itemType: FabricApiItemType): FabricApiItemFormat {
		const item = this.itemTypeFormats.find((item) => item.itemType == itemType);
		if (!item || !item.format) {
			return FabricApiItemFormat.DEFAULT;
		}
		return item.format;
	}

	static getFabricItemTypePublishOnSave(itemType: FabricApiItemType): boolean {
		const item = this.itemTypeFormats.find((item) => item.itemType == itemType);
		if (!item || !item.publishOnSave) {
			return false;
		}
		return item.publishOnSave;
	}

	static getFabricItemTypeCompactView(itemType: FabricApiItemType): boolean {
		const item = this.itemTypeFormats.find((item) => item.itemType == itemType);
		if (!item || !item.compactView) {
			return false;
		}
		return item.compactView;
	}

	static getFabricItemTypeUseItemNameAsFileName(itemType: FabricApiItemType): boolean {
		const item = this.itemTypeFormats.find((item) => item.itemType == itemType);
		if (!item || !item.useItemNameAsFileName) {
			return false;
		}
		if (!ITEM_FILE_NAMES.has(itemType)) {
			ThisExtension.Logger.logWarning(`UseItemNameAsfileName requested for item type '${itemType}' which does not have a single definition file!`);
			return false;
		}
		return item.useItemNameAsFileName;
	}

	static getFabricItemTypeDefinitionFileName(itemType: FabricApiItemType): string {
		if (ITEM_FILE_NAMES.has(itemType)) {
			return ITEM_FILE_NAMES.get(itemType);
		}
		return undefined;
	}

	static get iconStyle(): string {
		return this.getValue("iconStyle");
	}

	static get apiUrl(): string {
		//
		return "https://api.fabric.microsoft.com";
		return CLOUD_CONFIGS[this.cloud].apiEndpoint;
	}

	static get authenticationProvider(): string { return CLOUD_CONFIGS[this.cloud].authenticationProvider; }

	static get authenticationEndpoint(): string { return CLOUD_CONFIGS[this.cloud].authenticationEndpoint; }

	static get resourceId(): string {
		//return "https://analysis.windows.net/powerbi/api"
		return "https://api.fabric.microsoft.com";
		return CLOUD_CONFIGS[this.cloud].resourceId;
	}

	static get isSovereignCloud(): boolean {
		// If the base URL for the API is not pointed to api.fabric.microsoft.com assume 
		// we are pointed to the sovereign tenant
		// NOT YET SUPPORTED
		return this.apiUrl !== "https://api.fabric.microsoft.com";
	}

	static get config(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration("fabricStudio");
	}

	static getValue<T>(key: string): T {
		const value: T = this.config.get<T>(key);
		return value;
	}

	static setValue<T>(key: string, value: T, target: boolean | vscode.ConfigurationTarget = null): void {
		this.config.update(key, value, target);
	}

	static unsetValue(key: string, target: boolean | vscode.ConfigurationTarget = null): void {
		this.setValue(key, undefined, target);
	}

	static applySettings(): void {
		if (this.isSovereignCloud) {
			ThisExtension.Logger.logInfo(`Setting authentication endpoint to ${this.authenticationEndpoint}`);
			vscode.workspace.getConfiguration().update("microsoft-sovereign-cloud.endpoint", this.authenticationEndpoint, vscode.ConfigurationTarget.Workspace)
		}
	}
}