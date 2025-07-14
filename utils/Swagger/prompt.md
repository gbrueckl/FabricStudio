# Prompt

To download the current [REST API Specifications](https://github.com/microsoft/fabric-rest-api-specs) please run `download-api-specs.ps1`

- please create a script to create a combined swagger file of all endpoints defined under /definition
- use swagger-combine library from npm for the script
- the folder where the partial swagger.json file resides must not be part of the api path
- include examples
- resolve definitions
- make sure the output is compliant with Swagger 2.0
- validate the result using SwaggerParser.validate
