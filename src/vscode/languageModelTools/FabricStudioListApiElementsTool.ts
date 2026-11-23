import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiSpecificationUpdater } from '../apiSpecs/FabricApiSpecificationUpdater';

type ApiParameterValue = string | number | boolean;

interface iListApiElementsToolInput {
	/** A GET list endpoint from the Fabric API specification. */
	endpoint: string;
	/** Path and optional query parameters defined for the selected endpoint. */
	parameters?: Record<string, ApiParameterValue | undefined>;
}

/**
 * Lists the elements exposed by any list operation in the Fabric Swagger
 * definition. Pagination is followed automatically by FabricApiService.getList.
 */
export class FabricStudioListApiElementsTool implements vscode.LanguageModelTool<iListApiElementsToolInput> {
	private _listEndpointsPromise: Promise<Set<string>>;

	/** Loaded on first use - the API specification is downloaded on demand if it does not exist yet. */
	private get listEndpointsPromise(): Promise<Set<string>> {
		if (!this._listEndpointsPromise) {
			this._listEndpointsPromise = FabricApiSpecificationUpdater.readSpecification().then(content => this.getListEndpoints(content));
			// retry on the next invocation if the specification could not be loaded
			this._listEndpointsPromise.catch(() => this._listEndpointsPromise = undefined);
		}
		return this._listEndpointsPromise;
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iListApiElementsToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { endpoint: endpointTemplate, parameters = {} } = options.input;
		if (!endpointTemplate.startsWith('/v1/')) {
			throw new Error('endpoint must be a relative Fabric API v1 endpoint from the Fabric API specification.');
		}
		if (!(await this.listEndpointsPromise).has(endpointTemplate)) {
			throw new Error(`endpoint is not a GET list operation in the Fabric API specification: ${endpointTemplate}.`);
		}

		const pathParameterNames = new Set<string>();
		const endpoint = endpointTemplate.replace(/\{([^}]+)\}/g, (_match, parameterName: string) => {
			pathParameterNames.add(parameterName);
			const value = parameters[parameterName];
			if (value === undefined || value === '') {
				throw new Error(`Missing required path parameter: ${parameterName}.`);
			}
			return encodeURIComponent(String(value));
		});

		// Continuation tokens are server-provided and are followed automatically.
		const fixedQueryParameterNames = new Set<string>();
		new URLSearchParams(endpointTemplate.split('?')[1] ?? '').forEach((_value, name) => fixedQueryParameterNames.add(name));
		const queryParameters = Object.fromEntries(
			Object.entries(parameters).filter(([name, value]) =>
				!pathParameterNames.has(name) && !fixedQueryParameterNames.has(name) && name !== 'continuationToken' && value !== undefined
			)
		);

		const response = await FabricApiService.getList<unknown>(endpoint, queryParameters);
		if (response.error) {
			throw new Error(response.error.message);
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ endpoint, elements: response.success }, undefined, 2))
		]);
	}

	private getListEndpoints(swaggerJson: string): Set<string> {
		const swagger = JSON.parse(swaggerJson) as {
			paths?: Record<string, { get?: { operationId?: string; summary?: string } }>;
		};

		return new Set(
			Object.entries(swagger.paths ?? {})
				.filter(([, path]) => path.get?.operationId?.includes('_List') || /\blist(s)?\b/i.test(path.get?.summary ?? ''))
				.map(([endpoint]) => endpoint)
		);
	}
}
