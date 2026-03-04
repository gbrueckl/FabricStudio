# BACK LOG

This is the backlog of features to develop in the future. Each features needs to be described in detail so the description can be taken as basis for implementation. 
When using AI to implement a feature, make sure the description contains the full prompt to implement the whole feature at once.
Whenever a new backlog item is implemented, always increase the minor version by one and add the changes also to the changelog.

## Backlog Items
- [Parse .platform Files](#parse-platform-files) -> DONE!

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
- each file should be parsed and added to the global state to be used by the Hover provider in the future
- include proper logging for which file is being processed
- show a progress bar to track the progress across all files 
