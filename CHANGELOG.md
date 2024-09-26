# Change Log

**v0.9.9**:
- added [Workspace Role Assignments](https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/list-workspace-role-assignments?tabs=HTTP)
- added `Run` actions for notebooks, data pipelines and Spark Jobs.
- added viewer for Workspace Spark Settings

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
