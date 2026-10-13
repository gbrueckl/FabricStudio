import * as vscode from 'vscode';

import { FabricApiService } from '../../fabric/FabricApiService';

type ApiParameterValue = string | number | boolean;
type UpdateMethod = 'POST' | 'PATCH' | 'PUT';

interface iUpdateApiElementsToolInput {
	/** An update endpoint from resources/API/swagger.json. */
	endpoint: string;
	/** Path and optional query parameters defined for the selected endpoint. */
	parameters?: Record<string, ApiParameterValue | undefined>;
	/** Required only if Swagger defines more than one update method for the endpoint. */
	method?: UpdateMethod;
	/** The request payload defined for the selected endpoint. */
	body?: object;
}

/** Updates Fabric API elements through Swagger-defined write operations. */
export class FabricStudioUpdateApiElementsTool implements vscode.LanguageModelTool<iUpdateApiElementsToolInput> {
	private readonly updateOperationsPromise: Thenable<Map<string, UpdateMethod[]>>;

	public constructor(extensionUri: vscode.Uri) {
		this.updateOperationsPromise = vscode.workspace.fs
			.readFile(vscode.Uri.joinPath(extensionUri, 'resources', 'API', 'swagger.json'))
			.then(content => this.getUpdateOperations(new TextDecoder().decode(content)));
	}

	public async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<iUpdateApiElementsToolInput>): Promise<vscode.PreparedToolInvocation> {
		const operations = await this.updateOperationsPromise;
		const endpointTemplate = this.resolveEndpointTemplate(options.input.endpoint, operations);
		const method = this.getUpdateMethod(endpointTemplate, options.input.method, operations);

		return {
			invocationMessage: `Updating Fabric API element with ${method} ${options.input.endpoint}`,
			confirmationMessages: {
				title: 'Update Fabric API element',
				message: `Send a ${method} request to \`${options.input.endpoint}\` with the supplied payload?`
			}
		};
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iUpdateApiElementsToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const { endpoint: requestedEndpoint, parameters = {}, body = {} } = options.input;
		const operations = await this.updateOperationsPromise;
		const endpointTemplate = this.resolveEndpointTemplate(requestedEndpoint, operations);
		const method = this.getUpdateMethod(endpointTemplate, options.input.method, operations);

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

		const response = method === 'POST'
			? await FabricApiService.post(endpointWithParameters, body)
			: method === 'PATCH'
				? await FabricApiService.patch(endpointWithParameters, body)
				: await FabricApiService.put(endpointWithParameters, body);
		if (response.error) {
			throw new Error(response.error.message);
		}

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({ endpoint, method, result: response.success }, undefined, 2))
		]);
	}

	private getUpdateMethod(endpoint: string, requestedMethod: UpdateMethod | undefined, operations: Map<string, UpdateMethod[]>): UpdateMethod {
		const methods = operations.get(endpoint);
		if (!methods) {
			throw new Error(`endpoint is not an update operation in resources/API/swagger.json: ${endpoint}.`);
		}
		if (!requestedMethod && methods.length === 1) {
			return methods[0];
		}
		if (!requestedMethod) {
			throw new Error(`endpoint supports multiple update methods; specify one of: ${methods.join(', ')}.`);
		}
		if (!methods.includes(requestedMethod)) {
			throw new Error(`Unsupported method ${requestedMethod} for ${endpoint}. Use one of: ${methods.join(', ')}.`);
		}
		return requestedMethod;
	}

	private resolveEndpointTemplate(requestedEndpoint: string, operations: Map<string, UpdateMethod[]>): string {
		if (operations.has(requestedEndpoint)) {
			return requestedEndpoint;
		}

		const endpointShape = requestedEndpoint.replace(/\{[^}]+\}/g, '{}');
		const matchingEndpoint = [...operations.keys()].find(endpoint => endpoint.replace(/\{[^}]+\}/g, '{}') === endpointShape);
		if (!matchingEndpoint) {
			throw new Error(`endpoint is not an update operation in resources/API/swagger.json: ${requestedEndpoint}.`);
		}
		return matchingEndpoint;
	}

	private getUpdateOperations(swaggerJson: string): Map<string, UpdateMethod[]> {
		const swagger = JSON.parse(swaggerJson) as {
			paths?: Record<string, Record<string, { operationId?: string; summary?: string }>>;
		};
		const operations = new Map<string, UpdateMethod[]>();

		for (const [endpoint, path] of Object.entries(swagger.paths ?? {})) {
			for (const method of ['post', 'patch', 'put'] as const) {
				const operation = path[method];
				if (operation?.operationId?.includes('_Update') || /\bupdates?\b/i.test(operation?.summary ?? '')) {
					const updateMethod = method.toUpperCase() as UpdateMethod;
					operations.set(endpoint, [...(operations.get(endpoint) ?? []), updateMethod]);
				}
			}
		}

		return operations;
	}
}
