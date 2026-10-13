---
name: fabricstudio-update-api-definition
description: Update Fabric Studio's bundled Microsoft Fabric REST API Swagger definition. Use when asked to refresh or update the API definition; do not use for ordinary API client changes.
---

# Fabric Studio: Update API Definition

Run the repository's Node/TypeScript updater once from the Fabric Studio repository root:

```powershell
npm run update-api-specs
```

The updater performs one workflow: it downloads the current `main` branch of `microsoft/fabric-rest-api-specs` into a temporary directory, extracts it, dereferences and combines the Swagger JSON files, checks the resulting Swagger 2.0 document, and atomically publishes valid JSON to `resources/API/swagger.json`.

The downloaded ZIP and extracted source tree are temporary and are removed when the command finishes. Do not add generated temporary files to source control.

This requires network access and changes the generated Swagger definition. Obtain any required execution approval before running it.

The command exits with an error, without replacing `resources/API/swagger.json`, if downloading, extraction, dereferencing, combination, or JSON generation fails. Swagger 2.0 validation is non-blocking: report any validation warnings, but treat a valid JSON output as a completed refresh.

After a successful run, verify that `resources/API/swagger.json` is valid JSON and inspect its diff. Report any download, merge-collision, or Swagger-processing warnings.
