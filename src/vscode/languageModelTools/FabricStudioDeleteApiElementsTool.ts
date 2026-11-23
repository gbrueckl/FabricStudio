import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';
import { FabricApiSpecificationUpdater } from '../apiSpecs/FabricApiSpecificationUpdater';

type ApiParameterValue = string | number | boolean;

interface iDeleteApiElementsToolInput {
	/** A DELETE endpoint from the Fabric API specification. */
	endpoint: string;
	/** Path and optional query parameters defined for the selected endpoint. */
	parameters?: Record<string, ApiParameterValue | undefined>;
	/** An optional request payload, only when documented for the selected endpoint. */
	body?: object;
}

/** Deletes Fabric API elements through Swagger-defined DELETE operations. */
export class FabricStudioDeleteApiElementsTool implements vscode.LanguageModelTool<iDeleteApiElementsToolInput> {
	private _deleteEndpointsPromise: Promise<Set<string>>;

	/** Loaded on first use - the API specification is downloaded on demand if it does not exist yet. */
	private get deleteEndpointsPromise(): Promise<Set<string>> {
		if (!this._deleteEndpointsPromise) {
			this._deleteEndpointsPromise = FabricApiSpecificationUpdater.readSpecification().then(content => this.getDeleteEndpoints(content));
			// retry on the next invocation if the specification could not be loaded
			this._deleteEndpointsPromise.catch(() => this._deleteEndpointsPromise = undefined);
		}
		return this._deleteEndpointsPromise;
	}

	public async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<iDeleteApiElementsToolInput>): Promise<vscode.PreparedToolInvocation> {
		const endpoint = this.resolveEndpointTemplate(options.input.endpoint, await this.deleteEndpointsPromise);
		return {
			invocationMessage: `Deleting Fabric API element with DELETE ${endpoint}`,
			confirmationMessages: {
				title: 'Delete Fabric API element',
				message: `Send a DELETE request to \`${endpoint}\`? This action can permanently remove Fabric resources.`
			}
		};
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iDeleteApiElementsToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { endpoint: requestedEndpoint, parameters = {}, body } = options.input;
		const endpointTemplate = this.resolveEndpointTemplate(requestedEndpoint, await this.deleteEndpointsPromise);

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
		const [endpointPath, endpointQueryString = ''] = endpoint.split('?', 2);
		const endpointQuery = new URLSearchParams(endpointQueryString);
		for (const [name, value] of Object.entries(queryParameters)) {
			endpointQuery.set(name, String(value));
		}
		endpointQuery.sort();
		const serializedQuery = endpointQuery.toString();
		const endpointWithParameters = serializedQuery ? `${endpointPath}?${serializedQuery}` : endpointPath;

		const response = await FabricApiService.delete(endpointWithParameters, body);
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
			throw new Error(`endpoint is not a DELETE operation in the Fabric API specification: ${requestedEndpoint}.`);
		}
		return matchingEndpoint;
	}

	private getDeleteEndpoints(swaggerJson: string): Set<string> {
		const swagger = JSON.parse(swaggerJson) as {
			paths?: Record<string, { delete?: object }>;
		};

		return new Set(
			Object.entries(swagger.paths ?? {})
				.filter(([, path]) => path.delete)
				.map(([endpoint]) => endpoint)
		);
	}
}
