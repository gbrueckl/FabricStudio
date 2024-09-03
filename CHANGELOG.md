# Change Log

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
- migrated Fabric specific code from [Power BI VSCode extension](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio)
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
