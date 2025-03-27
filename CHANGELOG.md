# Change Log

**v1.10.2**:
- fixed issue with definitions in tree-views ([#11](/../../issues/11))
- fixed issue with tree-view hierarchy

**v1.10.1**:
- fixed issues with tree-view filters
- improved logging

**v1.10.0**:
- added the Admin treeview (read-only)

**v1.9.0**:
- added full definition directly into the workspace browser!
- fixed issue with display of email in status bar

**v1.8.2**:
- added `Definition` entry under each Fabric Item that allows `Edit Defintion` to directly open the definition
- added `MountedDataFactories`, `Graph APIs` and `Dataflows` to `Edit Definition` functionality
- fixed minor issues with publishing of `PBIR` and `TMDL` from local folder
- added support to publish from Fabric File System Provider to another workspace
- fixed issue with Graph API URL

**v1.8.1**:
- overwrite all files and folders (not only `definition` folder) as part of `Publish via Fabric Studio` except for report connection (`definition.pbir`)

**v1.8.0**:
- added new action `Publish via Fabric Studio` to publish local TMDL and PBIR definitions from the context menu

**v1.7.0**:
- added `Managed Private Endpoints` under each workspace

**v1.6.0**:
- added `Reset OneLake Cache` action on the workspace level
- added Schedules for `DataPipelines`, `Notebooks` and `SparkJobDefinitions` to Workspace Browser
- added Jobruns to `Notebooks`

**v1.5.0**:
- added new config setting `fabricStudio.showProWorkspaces` to also show Power BI workspaces that are not assigned to a capacity.
  The TMDL and PBIR editor of Fabric Studio also works on regular Pro workspaces!
- added action `Open in Fabric API Notebook` to the context menu

**v1.4.0**:
- added explicit actions for `Edit using TMDL` and `Edit using PBIR`
- added `Edit Definition` for EventStreams
- added new config setting `fabricStudio.iconStyle` to choose between `mono` and `color`
- changed the default icon style to `mono`
- reworked `Connections` treeview to include the gateways displayname
- added `Role Assignments` for connections
- added Drag&Drop for Gateway and Connection role assignments
- added Drag&Drop to assign a workspace to a capacity by dropping the workspace item on the capacity item
- addede `Delete` action for Role assignments

**v1.3.0**:
- added JSON Viewer for Item Connections
- added JSON Viewer for Item Shortcuts
- added JSON Viewer for Item DataAccessRoles

**v1.2.0**:
- added left status bar to see currently logged in user
- added user switch via left status bar and the command `FabricStudio.changeUser`

**v1.1.0**:
- added UI action to `Sync Metadata` for SQL endpoints
- added batch history for SQL endpoint operations
- reworked Generic Viewer
- added icons for job intances

**v1.0.0**:
- OFFICIAL PUBLIC RELEASE!

**v0.9.10**:
- added `Connections` tree view to browse gateways and connections
- reworked management of `itemTypes` for Fabric file system provider. They are now just optional settings.
- fixed issues `Delete` in Fabric file system provider
- reworked the way how item types for the Fabric file system provider can be configured
- minor fixes for error reporting
- added configuration setting for `publishOnSave` when configuring ItemType Formats via `fabricStudio.itemTypeFormats`
- added support for new items in the Custom File System Provider (=virtual file system)

**v0.9.9**:
- added [Workspace Role Assignments](https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/list-workspace-role-assignments?tabs=HTTP)
- added `Run` actions for notebooks, data pipelines and Spark Jobs.
- added viewer for Workspace Spark Settings
- added button for Workspace Filter
- added Drag & Drop provider for `WorkspaceRoleAssignments`
- added `Update` and `Delete` actions for `WorkspaceRoleAssignments`
- added `Delete` action for all Workspace Items
- fixed issue with modified files in the custom file system provider
- fixed issue with [`$(_cells)`](./README.md/#notebooks) notebook variable
- fixed issue with `Open in Fabric Service` for invalid items

**v0.9.8**:
- added support for [Item Data Access Roles](https://learn.microsoft.com/en-us/rest/api/fabric/core/onelake-data-access-security/list-data-access-roles?tabs=HTTP)
- added support for [Item Connections](https://learn.microsoft.com/en-us/rest/api/fabric/core/items/list-item-connections?tabs=HTTP)
- reworked [Item Shortcuts](https://learn.microsoft.com/en-us/rest/api/fabric/core/onelake-shortcuts/list-shortcuts?tabs=HTTP)

**v0.9.7**:
- added support for [GraphQL API](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-overview) queries in notebooks
- improved integration with [OneLake Extension](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.onelake-vscode)

**v0.9.6**:
- added support for [Deployment Pipelines](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/intro-to-deployment-pipelines?tabs=new)
- added proper sorting for items
- minor fixes

**v0.9.5**:
- added support for Shortcuts in Lakehouses
- added support to read Environment details
- fixed issue with `Browse in OneLake`

**v0.9.4**:
- added [Fabric Notebooks](/README.md/#notebooks) to run arbitrary REST API calls against Fabric
- added [GIT integration](/README.md/#fabric-git-integration) to manage Fabric source control from within VSCode
- update icons to official Fabric icons
- many more bug fixes and minor improvements!

**v0.9.0**:
- migrated Fabric specific code from [Power BI VSCode extension](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.powerbi-vscode)
- added Fabric Workspace Browser
  - browse all existing Fabric items
  - added `Open in Fabric` for `fabric:/` scheme
- added Fabric FileSystemProvider `fabric://<workspaceId>` to change definition of Fabric items
  - load all items with their definition
  - CRUD operations for Fabric item definitions
  - custom `FileDecorationProvider` to highlight added, changed and deleted items
  - `Publish to Fabric` in the context-menu of the Fabric Item
  - `(Re)load from Fabric` in the context-menu
- added Fabric Notebooks to run arbitrary REST API calls against Fabric
- added new config setting `fabricStudio.workspaceFilter` to define RegEx filters on workspace names
- added support for [Long Running Operation (LRO)](https://learn.microsoft.com/en-us/rest/api/fabric/articles/long-running-operation) when calling Fabric APIs from notebooks
