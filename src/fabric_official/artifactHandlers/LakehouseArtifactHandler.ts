import * as vscode from 'vscode';
import { IApiClientRequestOptions, IArtifact, IArtifactHandler, OperationRequestType } from '@microsoft/vscode-fabric-api';

export class LakehouseArtifactHandler implements IArtifactHandler {
    readonly artifactType = 'Lakehouse';

    // DEPRECATED - however, if implemented, will be called instead of readWorkflow !!!
    // onBeforeRequest(action: OperationRequestType, artifact: IArtifact, request: IApiClientRequestOptions): Promise<void> {
    //     if (request.pathTemplate) {
    //         request.pathTemplate = request.pathTemplate.replace('/items/', '/lakehouses/');
    //     }
    //     return Promise.resolve();
    // }

    readWorkflow = {
        async onBeforeRead(artifact: IArtifact, options: IApiClientRequestOptions): Promise<IApiClientRequestOptions> {
            const x = vscode.window.showInformationMessage('Reading lakehouse artifact');
            if (options.pathTemplate) {
                options.pathTemplate = options.pathTemplate.replace('/items/', '/lakehouses/');
            }
            return options;
        },
    };

    /*
    // Enforce ipynb download & validate local format before GET definition
    getDefinitionWorkflow = {
        async onBeforeGetDefinition(artifact, folder, options) {
            const format = await detectLocalNotebookFormat(folder); // 'ipynb' | 'py' | 'mixed' | 'unknown'
            if (format === 'mixed') { throw new Error('Mixed .py and .ipynb not supported'); }
            if (format !== 'py') { options.pathTemplate = appendQuery(options.pathTemplate, 'format=ipynb'); }
            return options;
        }
    };

    // Normalize definition before update (e.g., ensure explicit ipynb format marker)
    updateDefinitionWorkflow = {
        async onBeforeUpdateDefinition(_artifact, definition, _folder, options) {
            if (containsIpynbOnly(definition)) {
                definition.format = 'ipynb';
                // ensure body carries mutated object if wrapper present
                if (options.body?.definition) { options.body.definition = definition; }
            }
            return options;
        }
    };
    */
}
