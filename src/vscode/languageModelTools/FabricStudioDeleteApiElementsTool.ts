import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';

type ApiParameterValue = string | number | boolean;

interface iDeleteApiElementsToolInput {
	/** A DELETE endpoint from resources/API/swagger.json. */
	endpoint: string;
	/** Path and optional query parameters defined for the selected endpoint. */
	parameters?: Record<string, ApiParameterValue | undefined>;
	/** An optional request payload, only when documented for the selected endpoint. */
	body?: object;
}

/** Deletes Fabric API elements through Swagger-defined DELETE operations. */
export class FabricStudioDeleteApiElementsTool implements vscode.LanguageModelTool<iDeleteApiElementsToolInput> {
	private readonly deleteEndpointsPromise: Thenable<Set<string>>;

	public constructor(extensionUri: vscode.Uri) {
		this.deleteEndpointsPromise = vscode.workspace.fs
			.readFile(vscode.Uri.joinPath(extensionUri, 'resources', 'API', 'swagger.json'))
			.then(content => this.getDeleteEndpoints(new TextDecoder().decode(content)));
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
			throw new Error(`endpoint is not a DELETE operation in resources/API/swagger.json: ${requestedEndpoint}.`);
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
