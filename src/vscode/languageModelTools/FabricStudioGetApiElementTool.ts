import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiSpecificationUpdater } from '../apiSpecs/FabricApiSpecificationUpdater';

type ApiParameterValue = string | number | boolean;

interface iGetApiElementToolInput {
	/** A GET endpoint from the Fabric API specification. */
	endpoint: string;
	/** Path and optional query parameters defined for the selected endpoint. */
	parameters?: Record<string, ApiParameterValue | undefined>;
}

/** Retrieves a Fabric API resource through any Swagger-defined GET operation. */
export class FabricStudioGetApiElementTool implements vscode.LanguageModelTool<iGetApiElementToolInput> {
	private _getEndpointsPromise: Promise<Set<string>>;

	/** Loaded on first use - the API specification is downloaded on demand if it does not exist yet. */
	private get getEndpointsPromise(): Promise<Set<string>> {
		if (!this._getEndpointsPromise) {
			this._getEndpointsPromise = FabricApiSpecificationUpdater.readSpecification().then(content => this.getGetEndpoints(content));
			// retry on the next invocation if the specification could not be loaded
			this._getEndpointsPromise.catch(() => this._getEndpointsPromise = undefined);
		}
		return this._getEndpointsPromise;
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iGetApiElementToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { endpoint: requestedEndpoint, parameters = {} } = options.input;
		const endpointTemplate = this.resolveEndpointTemplate(requestedEndpoint, await this.getEndpointsPromise);

		const pathParameterNames = new Set<string>();
		const requestedPathParameterNames = Array.from(requestedEndpoint.matchAll(/\{([^}]+)\}/g), match => match[1]);
		const requestedPathParameterNameSet = new Set(requestedPathParameterNames);
		let pathParameterIndex = 0;
		const endpoint = endpointTemplate.replace(/\{([^}]+)\}/g, (_match, parameterName: string) => {
			pathParameterNames.add(parameterName);
			const requestedParameterName = requestedPathParameterNames[pathParameterIndex++];
			const value = parameters[parameterName] ?? parameters[requestedParameterName];
			if (value === undefined || value === '') {
				throw new Error(`Missing required path parameter: ${parameterName}.`);
			}
			return encodeURIComponent(String(value));
		});

		const fixedQueryParameterNames = new Set<string>();
		new URLSearchParams(endpointTemplate.split('?')[1] ?? '').forEach((_value, name) => fixedQueryParameterNames.add(name));
		const queryParameters = Object.fromEntries(
			Object.entries(parameters).filter(([name, value]) =>
				!pathParameterNames.has(name) && !requestedPathParameterNameSet.has(name) && !fixedQueryParameterNames.has(name) && value !== undefined
			)
		);

		const response = await FabricApiService.get<unknown>(endpoint, queryParameters);
		if (response.error) {
			throw new Error(response.error.message);
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ endpoint, result: response.success }, undefined, 2))
		]);
	}

	private resolveEndpointTemplate(requestedEndpoint: string, endpoints: Set<string>): string {
		if (endpoints.has(requestedEndpoint)) {
			return requestedEndpoint;
		}

		const endpointShape = requestedEndpoint.replace(/\{[^}]+\}/g, '{}');
		const matchingEndpoint = [...endpoints].find(endpoint => endpoint.replace(/\{[^}]+\}/g, '{}') === endpointShape);
		if (!matchingEndpoint) {
			throw new Error(`endpoint is not a GET operation in the Fabric API specification: ${requestedEndpoint}.`);
		}
		return matchingEndpoint;
	}

	private getGetEndpoints(swaggerJson: string): Set<string> {
		const swagger = JSON.parse(swaggerJson) as {
			paths?: Record<string, { get?: object }>;
		};

		return new Set(
			Object.entries(swagger.paths ?? {})
				.filter(([, path]) => path.get)
				.map(([endpoint]) => endpoint)
		);
	}
}
