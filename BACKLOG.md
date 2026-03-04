# BACK LOG

This is the backlog of features to develop in the future. Each features needs to be described in detail so the description can be taken as basis for implementation. 
When using AI to implement a feature, make sure the description contains the full prompt to implement the whole feature at once.
Whenever a new backlog item is implemented, always increase the minor version by one and add the changes also to the changelog. If it is a bug, please only increase the patch version.

## Backlog Items
- [Parse .platform Files](#parse-platform-files) -> DONE!
- BUG: [Cancellation Support for .platform Parsing](#cancellation-support-for-platform-parsing)

# Parse .platform Files
When working with Fabric Git repositories, each Fabric items is stored in its own folder. Within every of those folders, a specific `.platform` file resides which holds metadata about the actual item and is formatted as JSON. The structure of the file is defined below:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": {
    "type": "Notebook",
    "displayName": "My Notebook",
    "description": "This is my first notebook which does something"
  },
  "config": {
    "version": "2.0",
    "logicalId": "a3f4e738-3ca6-a38a-4537-2fcd8ddcb61a"
  }
}
```

The `logicalId` is an internal, unique identifier within the repository and is used when this item is referenced by other items. E.g. a pipeline calling a notebook.

Those logical IDs should also be resolved by the hover provider. For this to work we first need to find and parse all the `.platform` files in the current workspace and add them to our global state. The key for the global state should be the `logicalId`, `displayName` is the name and `type` is the item type. The workspace should be "Current Workspace" and WorkspaceID should be an empty GUID.

These steps shoud be done:
- Add be a new VSCode command that searches the current VSCode workspace for those `.platform`
- only local files should be considered
- files should be processed in parallel/async to speed up parsing
- each file should be parsed and added to the global state to be used by the Hover provider in the future
- include proper logging for which file is being processed
- show a progress bar to track the progress across all files

# Cancellation Support for .platform Parsing
The current `.platform` file parsing in `FabricPlatformParser.parsePlatformFiles()` (`src/fabric/FabricPlatformParser.ts`) does not support cancellation. The progress notification is created with `cancellable: false` and the `CancellationToken` provided by `withProgress` is ignored. Since file reads are now fired in parallel via `Promise.all`, there is no way for the user to abort the operation once it starts.

The following changes should be made:

- Set `cancellable: true` in the `withProgress` options
- Accept the `token: vscode.CancellationToken` parameter in the progress callback (it is the second argument after `progress`)
- Before firing the parallel file reads, pass the `token` into each read task so it can respect cancellation
- Inside the `.map()` that creates `fileReadPromises`, check `token.isCancellationRequested` before reading each file. If cancellation was requested, skip the file and return `undefined` content
- After `Promise.all(fileReadPromises)` resolves, check `token.isCancellationRequested` again. If cancelled, log a message and return early without processing or caching any results
- In the `for` loop that processes file results and builds `cachePromises`, check `token.isCancellationRequested` at the start of each iteration. If cancelled, break out of the loop early
- Log that the operation was cancelled and show an information message to the user (e.g. `"Fabric Studio: .platform parsing cancelled by user."`)
- The final `Promise.all(cachePromises)` should still be awaited for items already queued before cancellation, to avoid partial/corrupt state
