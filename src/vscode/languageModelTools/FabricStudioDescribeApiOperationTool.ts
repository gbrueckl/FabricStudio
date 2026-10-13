import * as vscode from 'vscode';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface iDescribeApiOperationToolInput {
	/** An endpoint template from resources/API/swagger.json. */
	endpoint?: string;
	/** Required when the endpoint supports more than one HTTP method. */
	method?: ApiMethod;
	/** Search text used to discover endpoint templates when the endpoint is not known. */
	search?: string;
}

interface iSwaggerOperation {
	operationId?: string;
	summary?: string;
	description?: string;
	parameters?: unknown[];
	consumes?: string[];
}

/** Describes an API operation from the bundled Swagger definition without exposing the file to the language model. */
export class FabricStudioDescribeApiOperationTool implements vscode.LanguageModelTool<iDescribeApiOperationToolInput> {
	private readonly operationsPromise: Thenable<Map<string, Map<ApiMethod, iSwaggerOperation>>>;

	public constructor(extensionUri: vscode.Uri) {
		this.operationsPromise = vscode.workspace.fs
			.readFile(vscode.Uri.joinPath(extensionUri, 'resources', 'API', 'swagger.json'))
			.then(content => this.getOperations(new TextDecoder().decode(content)));
	}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<iDescribeApiOperationToolInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const operations = await this.operationsPromise;
		if (!options.input.endpoint) {
			if (!options.input.search) {
				throw new Error('Provide endpoint or search.');
			}
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(JSON.stringify({
					operations: this.searchOperations(options.input.search, operations)
				}, undefined, 2))
			]);
		}

		const endpoint = this.resolveEndpointTemplate(options.input.endpoint, operations);
		const methods = operations.get(endpoint)!;
		const method = this.resolveMethod(options.input.method, methods);
		const operation = methods.get(method)!;

		const parameters = (operation.parameters ?? []).map(parameter => this.describeParameter(parameter));
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify({
				endpoint,
				method,
				operationId: operation.operationId,
				summary: operation.summary,
				description: operation.description,
				consumes: operation.consumes,
				parameters
			}, undefined, 2))
		]);
	}

	private resolveEndpointTemplate(requestedEndpoint: string, operations: Map<string, Map<ApiMethod, iSwaggerOperation>>): string {
		if (operations.has(requestedEndpoint)) {
			return requestedEndpoint;
		}

		const endpointShape = requestedEndpoint.replace(/\{[^}]+\}/g, '{}');
		const matchingEndpoint = [...operations.keys()].find(endpoint => endpoint.replace(/\{[^}]+\}/g, '{}') === endpointShape);
		if (!matchingEndpoint) {
			throw new Error(`endpoint is not defined in resources/API/swagger.json: ${requestedEndpoint}.`);
		}
		return matchingEndpoint;
	}

	private resolveMethod(requestedMethod: ApiMethod | undefined, methods: Map<ApiMethod, iSwaggerOperation>): ApiMethod {
		if (requestedMethod && methods.has(requestedMethod)) {
			return requestedMethod;
		}
		if (!requestedMethod && methods.size === 1) {
			return methods.keys().next().value;
		}
		if (!requestedMethod) {
			throw new Error(`endpoint supports multiple methods; specify one of: ${[...methods.keys()].join(', ')}.`);
		}
		throw new Error(`Method ${requestedMethod} is not defined for this endpoint. Use one of: ${[...methods.keys()].join(', ')}.`);
	}

	private describeParameter(parameter: unknown): unknown {
		const value = parameter as Record<string, unknown>;
		return {
			name: value.name,
			in: value.in,
			required: value.required ?? false,
			description: value.description,
			type: value.type,
			format: value.format,
			enum: value.enum,
			schema: value.schema
		};
	}

	private searchOperations(search: string, operations: Map<string, Map<ApiMethod, iSwaggerOperation>>): object[] {
		const searchText = search.toLowerCase();
		const matches: object[] = [];
		for (const [endpoint, methods] of operations) {
			for (const [method, operation] of methods) {
				const searchableText = `${endpoint} ${operation.operationId ?? ''} ${operation.summary ?? ''}`.toLowerCase();
				if (searchableText.includes(searchText)) {
					matches.push({ endpoint, method, operationId: operation.operationId, summary: operation.summary });
				}
			}
		}
		return matches.slice(0, 25);
	}

	private getOperations(swaggerJson: string): Map<string, Map<ApiMethod, iSwaggerOperation>> {
		const swagger = JSON.parse(swaggerJson) as {
			paths?: Record<string, Record<string, iSwaggerOperation>>;
		};
		const operations = new Map<string, Map<ApiMethod, iSwaggerOperation>>();

		for (const [endpoint, path] of Object.entries(swagger.paths ?? {})) {
			const methods = new Map<ApiMethod, iSwaggerOperation>();
			for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
				if (path[method]) {
					methods.set(method.toUpperCase() as ApiMethod, path[method]);
				}
			}
			if (methods.size > 0) {
				operations.set(endpoint, methods);
			}
		}

		return operations;
	}
}
