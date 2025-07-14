import * as fs from 'fs';
import * as path from 'path';

interface SwaggerDoc {
    swagger: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    schemes: string[];
    host: string;
    basePath: string;
    paths: Record<string, any>;
    definitions?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
    securityDefinitions?: Record<string, any>;
    security?: any[];
    tags?: any[];
    externalDocs?: any;
}

interface ExampleFile {
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
}

async function combineSwaggerFiles(): Promise<void> {
    const definitionDir = path.join(__dirname, 'definition');
    const outputDir = path.join(__dirname, '..', '..', 'resources', 'API');
    const outputFile = path.join(outputDir, 'swagger.json');

    console.log('Starting swagger file combination...');
    console.log(`Definition directory: ${definitionDir}`);
    console.log(`Output file: ${outputFile}`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read common definitions first
    const commonDefinitionsPath = path.join(definitionDir, 'common', 'definitions.json');
    let commonDefinitions: Record<string, any> = {};
    
    if (fs.existsSync(commonDefinitionsPath)) {
        try {
            const commonContent = fs.readFileSync(commonDefinitionsPath, 'utf8');
            const commonDoc = JSON.parse(commonContent);
            if (commonDoc.definitions) {
                commonDefinitions = commonDoc.definitions;
                console.log(`✓ Loaded common definitions: ${Object.keys(commonDefinitions).length} definitions`);
            }
        } catch (error) {
            console.log(`⚠ Could not load common definitions: ${error}`);
        }
    }

    // Find all swagger.json files in subdirectories
    const swaggerFiles: { path: string; subdir: string }[] = [];
    const subdirectories = fs.readdirSync(definitionDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name !== 'common')
        .map(dirent => dirent.name);

    console.log(`Found ${subdirectories.length} subdirectories to scan:`);
    
    for (const subdir of subdirectories) {
        const swaggerPath = path.join(definitionDir, subdir, 'swagger.json');
        if (fs.existsSync(swaggerPath)) {
            swaggerFiles.push({ path: swaggerPath, subdir });
            console.log(`  - ${subdir}/swagger.json`);
        } else {
            console.log(`  - ${subdir}/ (no swagger.json found)`);
        }
    }

    if (swaggerFiles.length === 0) {
        console.error('No swagger.json files found in subdirectories!');
        process.exit(1);
    }

    console.log(`\nFound ${swaggerFiles.length} swagger files to merge`);

    // Create the master swagger document
    const masterSwagger: SwaggerDoc = {
        swagger: '2.0',
        info: {
            title: 'Microsoft Fabric REST APIs - Combined',
            version: 'v1',
            description: 'Combined REST API specifications for Microsoft Fabric services'
        },
        schemes: ['https'],
        host: 'api.fabric.microsoft.com',
        basePath: '/v1',
        paths: {},
        definitions: { ...commonDefinitions },
        parameters: {},
        responses: {},
        securityDefinitions: {},
        security: [],
        tags: []
    };

    let totalExamples = 0;
    let totalDefinitions = Object.keys(commonDefinitions).length;

    // Process each swagger file
    for (const { path: filePath, subdir } of swaggerFiles) {
        try {
            console.log(`Processing ${subdir}...`);
            
            // Read main swagger file
            const swaggerContent = fs.readFileSync(filePath, 'utf8');
            const swaggerDoc: SwaggerDoc = JSON.parse(swaggerContent);
            
            // Remove folder-specific basePath to avoid folder names in API paths
            if (swaggerDoc.basePath && swaggerDoc.basePath !== '/v1') {
                swaggerDoc.basePath = '/v1';
            }
            
            // Read definitions.json if it exists
            const definitionsPath = path.join(definitionDir, subdir, 'definitions.json');
            if (fs.existsSync(definitionsPath)) {
                const definitionsContent = fs.readFileSync(definitionsPath, 'utf8');
                const definitionsDoc = JSON.parse(definitionsContent);
                
                if (definitionsDoc.definitions) {
                    Object.assign(swaggerDoc.definitions || {}, definitionsDoc.definitions);
                    if (!swaggerDoc.definitions) {
                        swaggerDoc.definitions = {};
                    }
                    Object.assign(swaggerDoc.definitions, definitionsDoc.definitions);
                    console.log(`  ✓ Resolved definitions from ${subdir}/definitions.json`);
                }
            }
            
            // Process examples
            const examplesDir = path.join(definitionDir, subdir, 'examples');
            let exampleCount = 0;
            if (fs.existsSync(examplesDir)) {
                const exampleFiles = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json'));
                
                for (const exampleFile of exampleFiles) {
                    try {
                        const examplePath = path.join(examplesDir, exampleFile);
                        const exampleContent = fs.readFileSync(examplePath, 'utf8');
                        const example: ExampleFile = JSON.parse(exampleContent);
                        
                        // Find matching operation in swagger and add examples
                        if (addExamplesToSwagger(swaggerDoc, example, exampleFile)) {
                            exampleCount++;
                        }
                    } catch (error) {
                        console.log(`    ⚠ Could not process example ${exampleFile}: ${error}`);
                    }
                }
                
                totalExamples += exampleCount;
                console.log(`  ✓ Processed ${exampleCount} examples from ${subdir}/examples/`);
            }
            
            // Resolve external $ref definitions to internal ones
            resolveExternalReferences(swaggerDoc, subdir);
            
            // Clean up invalid paths with query parameters
            cleanUpInvalidPaths(swaggerDoc, subdir);
            
            // Fix nullable required properties
            fixNullableRequiredProperties(swaggerDoc, subdir);
            
            // Remove all nullable properties
            removeAllNullableProperties(swaggerDoc, subdir);
            
            // Merge into master swagger
            mergeSwaggerDoc(masterSwagger, swaggerDoc);
            
            if (swaggerDoc.definitions) {
                totalDefinitions += Object.keys(swaggerDoc.definitions).length;
            }
            
            console.log(`  ✓ Processed ${subdir}: ${swaggerDoc.info.title}`);
        } catch (error) {
            console.error(`  ✗ Failed to process ${filePath}:`, error);
        }
    }

    // Clean up empty objects
    if (masterSwagger.definitions && Object.keys(masterSwagger.definitions).length === 0) {
        delete masterSwagger.definitions;
    }
    if (masterSwagger.parameters && Object.keys(masterSwagger.parameters).length === 0) {
        delete masterSwagger.parameters;
    }
    if (masterSwagger.responses && Object.keys(masterSwagger.responses).length === 0) {
        delete masterSwagger.responses;
    }
    if (masterSwagger.securityDefinitions && Object.keys(masterSwagger.securityDefinitions).length === 0) {
        delete masterSwagger.securityDefinitions;
    }
    if (masterSwagger.security && masterSwagger.security.length === 0) {
        delete masterSwagger.security;
    }
    if (masterSwagger.tags && masterSwagger.tags.length === 0) {
        delete masterSwagger.tags;
    }

    // Write the combined swagger file
    console.log('\nWriting combined swagger file...');
    const outputContent = JSON.stringify(masterSwagger, null, 2);
    fs.writeFileSync(outputFile, outputContent, 'utf8');

    // Generate statistics
    const pathCount = Object.keys(masterSwagger.paths).length;
    const definitionCount = masterSwagger.definitions ? Object.keys(masterSwagger.definitions).length : 0;
    const tagCount = masterSwagger.tags ? masterSwagger.tags.length : 0;

    console.log('\n✅ Swagger combination completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Input files: ${swaggerFiles.length}`);
    console.log(`   - Combined paths: ${pathCount}`);
    console.log(`   - Combined definitions: ${definitionCount}`);
    console.log(`   - Combined tags: ${tagCount}`);
    console.log(`   - Total examples added: ${totalExamples}`);
    console.log(`   - Output file: ${outputFile}`);
    console.log(`   - File size: ${(outputContent.length / 1024).toFixed(1)} KB`);
}

function mergeSwaggerDoc(master: SwaggerDoc, source: SwaggerDoc): void {
    // Merge paths
    if (source.paths) {
        Object.assign(master.paths, source.paths);
    }
    
    // Merge definitions
    if (source.definitions) {
        if (!master.definitions) master.definitions = {};
        Object.assign(master.definitions, source.definitions);
    }
    
    // Merge parameters
    if (source.parameters) {
        if (!master.parameters) master.parameters = {};
        Object.assign(master.parameters, source.parameters);
    }
    
    // Merge responses
    if (source.responses) {
        if (!master.responses) master.responses = {};
        Object.assign(master.responses, source.responses);
    }
    
    // Merge security definitions
    if (source.securityDefinitions) {
        if (!master.securityDefinitions) master.securityDefinitions = {};
        Object.assign(master.securityDefinitions, source.securityDefinitions);
    }
    
    // Merge tags (avoid duplicates)
    if (source.tags) {
        if (!master.tags) master.tags = [];
        for (const tag of source.tags) {
            const existingTag = master.tags.find(t => t.name === tag.name);
            if (!existingTag) {
                master.tags.push(tag);
            }
        }
    }
    
    // Merge security (avoid duplicates)
    if (source.security) {
        if (!master.security) master.security = [];
        for (const securityItem of source.security) {
            const exists = master.security.some(existing => 
                JSON.stringify(existing) === JSON.stringify(securityItem)
            );
            if (!exists) {
                master.security.push(securityItem);
            }
        }
    }
}

function addExamplesToSwagger(swaggerDoc: SwaggerDoc, example: ExampleFile, fileName: string): boolean {
    // Try to match example to operations based on file name and parameters
    const operationName = fileName.replace('.json', '').toLowerCase();
    let exampleAdded = false;
    
    for (const pathKey of Object.keys(swaggerDoc.paths)) {
        const pathItem = swaggerDoc.paths[pathKey];
        
        for (const method of Object.keys(pathItem)) {
            const operation = pathItem[method];
            
            if (operation.operationId && operation.operationId.toLowerCase().includes(operationName)) {
                // Add parameter examples
                if (example.parameters && operation.parameters) {
                    for (const param of operation.parameters) {
                        if (example.parameters[param.name]) {
                            param.example = example.parameters[param.name];
                        }
                    }
                }
                
                // Add response examples
                if (example.responses && operation.responses) {
                    for (const statusCode of Object.keys(example.responses)) {
                        if (operation.responses[statusCode] && example.responses[statusCode].body) {
                            if (!operation.responses[statusCode].examples) {
                                operation.responses[statusCode].examples = {};
                            }
                            operation.responses[statusCode].examples['application/json'] = example.responses[statusCode].body;
                            exampleAdded = true;
                        }
                    }
                }
            }
        }
    }
    
    return exampleAdded;
}

function resolveExternalReferences(swaggerDoc: SwaggerDoc, currentSubdir: string): void {
    try {
        // Deep resolve all $ref properties recursively
        resolveReferencesRecursively(swaggerDoc);
        console.log(`  ✓ Resolved external references for ${currentSubdir}`);
    } catch (error) {
        console.log(`    ⚠ Could not resolve references for ${currentSubdir}: ${error}`);
    }
}

function resolveReferencesRecursively(obj: any): void {
    if (obj === null || typeof obj !== 'object') {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach(item => resolveReferencesRecursively(item));
        return;
    }

    for (const key in obj) {
        if (key === '$ref' && typeof obj[key] === 'string') {
            obj[key] = resolveReference(obj[key]);
        } else {
            resolveReferencesRecursively(obj[key]);
        }
    }
}

function resolveReference(ref: string): string {
    // Handle different reference patterns and convert them to internal references
    
    // Pattern: ./definitions.json#/definitions/Something -> #/definitions/Something
    if (ref.startsWith('./definitions.json#/definitions/')) {
        return ref.replace('./definitions.json#/definitions/', '#/definitions/');
    }
    
    // Pattern: ../common/definitions.json#/definitions/Something -> #/definitions/Something
    if (ref.includes('/common/definitions.json#/definitions/')) {
        return ref.replace(/.*\/common\/definitions\.json#\/definitions\//, '#/definitions/');
    }
    
    // Pattern: ../common/spark_definitions.json#/definitions/Something -> #/definitions/Something
    if (ref.includes('/common/spark_definitions.json#/definitions/')) {
        return ref.replace(/.*\/common\/spark_definitions\.json#\/definitions\//, '#/definitions/');
    }
    
    // Pattern: ../platform/definitions/platform.json#/definitions/Something -> #/definitions/Something
    if (ref.includes('/platform/definitions/platform.json#/definitions/')) {
        return ref.replace(/.*\/platform\/definitions\/platform\.json#\/definitions\//, '#/definitions/');
    }
    
    // Pattern: ./definitions/subfolder.json#/definitions/Something -> #/definitions/Something
    if (ref.match(/^\.\/definitions\/[^/]+\.json#\/definitions\//)) {
        return ref.replace(/^\.\/definitions\/[^/]+\.json#\/definitions\//, '#/definitions/');
    }
    
    // Pattern: ../definitions.json#/definitions/Something -> #/definitions/Something
    if (ref.includes('/definitions.json#/definitions/')) {
        return ref.replace(/.*\/definitions\.json#\/definitions\//, '#/definitions/');
    }
    
    // Pattern: ../../common/definitions.json#/definitions/Something -> #/definitions/Something
    if (ref.includes('../../common/definitions.json#/definitions/')) {
        return ref.replace(/.*\/common\/definitions\.json#\/definitions\//, '#/definitions/');
    }
    
    // If it's already an internal reference or unknown pattern, leave it as is
    return ref;
}

function cleanUpInvalidPaths(swaggerDoc: SwaggerDoc, currentSubdir: string): void {
    try {
        const pathsToFix: { oldPath: string; newPath: string; queryParams: string }[] = [];
        
        // Find paths with query parameters
        for (const pathKey of Object.keys(swaggerDoc.paths)) {
            if (pathKey.includes('?')) {
                const [cleanPath, queryString] = pathKey.split('?');
                pathsToFix.push({
                    oldPath: pathKey,
                    newPath: cleanPath,
                    queryParams: queryString
                });
            }
        }
        
        // Fix each invalid path
        for (const { oldPath, newPath, queryParams } of pathsToFix) {
            const pathItem = swaggerDoc.paths[oldPath];
            
            // Parse query parameters
            const params = new URLSearchParams(queryParams);
            
            // Add query parameters to each operation in the path
            for (const method of Object.keys(pathItem)) {
                const operation = pathItem[method];
                if (operation && typeof operation === 'object') {
                    if (!operation.parameters) {
                        operation.parameters = [];
                    }
                    
                    // Add each query parameter as a parameter definition
                    for (const [paramName, paramValue] of params.entries()) {
                        // Check if parameter already exists
                        const existingParam = operation.parameters.find((p: any) => 
                            p.name === paramName && p.in === 'query'
                        );
                        
                        if (!existingParam) {
                            operation.parameters.push({
                                name: paramName,
                                in: 'query',
                                type: 'string',
                                required: true,
                                enum: [paramValue], // Since it was hardcoded in the path, make it an enum
                                description: `Query parameter (moved from path): ${paramName}=${paramValue}`
                            });
                        }
                    }
                }
            }
            
            // Move the path item to the clean path
            if (swaggerDoc.paths[newPath]) {
                // If clean path already exists, merge the operations
                Object.assign(swaggerDoc.paths[newPath], pathItem);
            } else {
                swaggerDoc.paths[newPath] = pathItem;
            }
            
            // Remove the old invalid path
            delete swaggerDoc.paths[oldPath];
        }
        
        if (pathsToFix.length > 0) {
            console.log(`  ✓ Fixed ${pathsToFix.length} invalid paths with query parameters in ${currentSubdir}`);
        }
    } catch (error) {
        console.log(`    ⚠ Could not clean up invalid paths for ${currentSubdir}: ${error}`);
    }
}

function fixNullableRequiredProperties(swaggerDoc: SwaggerDoc, currentSubdir: string): void {
    try {
        let fixedCount = 0;
        
        // Process definitions
        if (swaggerDoc.definitions) {
            for (const [defName, definition] of Object.entries(swaggerDoc.definitions)) {
                if (definition && typeof definition === 'object') {
                    fixedCount += fixNullableInSchema(definition, `definition ${defName}`);
                }
            }
        }
        
        // Process paths for inline schemas
        if (swaggerDoc.paths) {
            for (const [pathName, pathItem] of Object.entries(swaggerDoc.paths)) {
                if (pathItem && typeof pathItem === 'object') {
                    for (const [method, operation] of Object.entries(pathItem)) {
                        if (operation && typeof operation === 'object') {
                            const op = operation as any;
                            
                            // Check parameters
                            if (op.parameters && Array.isArray(op.parameters)) {
                                for (const param of op.parameters) {
                                    if (param.schema) {
                                        fixedCount += fixNullableInSchema(param.schema, `parameter in ${pathName} ${method}`);
                                    }
                                }
                            }
                            
                            // Check responses
                            if (op.responses) {
                                for (const [statusCode, response] of Object.entries(op.responses)) {
                                    if (response && typeof response === 'object') {
                                        const resp = response as any;
                                        if (resp.schema) {
                                            fixedCount += fixNullableInSchema(resp.schema, `response ${statusCode} in ${pathName} ${method}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if (fixedCount > 0) {
            console.log(`  ✓ Fixed ${fixedCount} nullable required properties in ${currentSubdir}`);
        }
    } catch (error) {
        console.log(`    ⚠ Could not fix nullable required properties for ${currentSubdir}: ${error}`);
    }
}

function fixNullableInSchema(schema: any, context: string): number {
    let fixedCount = 0;
    
    if (!schema || typeof schema !== 'object') {
        return 0;
    }
    
    // Handle the current schema
    if (schema.required && Array.isArray(schema.required) && schema.properties) {
        for (const requiredProp of schema.required) {
            const property = schema.properties[requiredProp];
            if (property && typeof property === 'object' && property.nullable === true) {
                // Remove nullable from required property
                delete property.nullable;
                fixedCount++;
                console.log(`    ⚠ Removed nullable from required property '${requiredProp}' in ${context}`);
            }
        }
    }
    
    // Also check for allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach(key => {
        if (schema[key] && Array.isArray(schema[key])) {
            for (const subSchema of schema[key]) {
                fixedCount += fixNullableInSchema(subSchema, context);
            }
        }
    });
    
    // Recursively check properties
    if (schema.properties) {
        for (const [propName, property] of Object.entries(schema.properties)) {
            fixedCount += fixNullableInSchema(property, `${context}.${propName}`);
        }
    }
    
    // Check items (for arrays)
    if (schema.items) {
        fixedCount += fixNullableInSchema(schema.items, `${context}[]`);
    }
    
    // Check additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        fixedCount += fixNullableInSchema(schema.additionalProperties, `${context}.additionalProperties`);
    }
    
    return fixedCount;
}

function removeAllNullableProperties(swaggerDoc: SwaggerDoc, currentSubdir: string): void {
    try {
        let removedCount = 0;
        
        // Process definitions
        if (swaggerDoc.definitions) {
            for (const [defName, definition] of Object.entries(swaggerDoc.definitions)) {
                if (definition && typeof definition === 'object') {
                    removedCount += removeNullableFromSchema(definition, `definition ${defName}`);
                }
            }
        }
        
        // Process paths for inline schemas
        if (swaggerDoc.paths) {
            for (const [pathName, pathItem] of Object.entries(swaggerDoc.paths)) {
                if (pathItem && typeof pathItem === 'object') {
                    for (const [method, operation] of Object.entries(pathItem)) {
                        if (operation && typeof operation === 'object') {
                            const op = operation as any;
                            
                            // Check parameters
                            if (op.parameters && Array.isArray(op.parameters)) {
                                for (const param of op.parameters) {
                                    if (param.schema) {
                                        removedCount += removeNullableFromSchema(param.schema, `parameter in ${pathName} ${method}`);
                                    }
                                }
                            }
                            
                            // Check responses
                            if (op.responses) {
                                for (const [statusCode, response] of Object.entries(op.responses)) {
                                    if (response && typeof response === 'object') {
                                        const resp = response as any;
                                        if (resp.schema) {
                                            removedCount += removeNullableFromSchema(resp.schema, `response ${statusCode} in ${pathName} ${method}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if (removedCount > 0) {
            console.log(`  ✓ Removed ${removedCount} nullable properties in ${currentSubdir}`);
        }
    } catch (error) {
        console.log(`    ⚠ Could not remove nullable properties for ${currentSubdir}: ${error}`);
    }
}

function removeNullableFromSchema(schema: any, context: string): number {
    let removedCount = 0;
    
    if (!schema || typeof schema !== 'object') {
        return 0;
    }
    
    // Remove nullable property if it exists
    if (schema.nullable === true) {
        delete schema.nullable;
        removedCount++;
    }
    
    // Also check for allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach(key => {
        if (schema[key] && Array.isArray(schema[key])) {
            for (const subSchema of schema[key]) {
                removedCount += removeNullableFromSchema(subSchema, context);
            }
        }
    });
    
    // Recursively check properties
    if (schema.properties) {
        for (const [propName, property] of Object.entries(schema.properties)) {
            removedCount += removeNullableFromSchema(property, `${context}.${propName}`);
        }
    }
    
    // Check items (for arrays)
    if (schema.items) {
        removedCount += removeNullableFromSchema(schema.items, `${context}[]`);
    }
    
    // Check additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        removedCount += removeNullableFromSchema(schema.additionalProperties, `${context}.additionalProperties`);
    }
    
    return removedCount;
}

// Run the script
combineSwaggerFiles().catch(error => {
    console.error('Error combining swagger files:', error);
    process.exit(1);
});
