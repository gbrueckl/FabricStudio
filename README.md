# Fabric Studio
[![Version](https://img.shields.io/visual-studio-marketplace/v/GerhardBrueckl.fabricstudio)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/GerhardBrueckl.fabricstudio)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/GerhardBrueckl.fabricstudio)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio)
[![Ratings](https://img.shields.io/visual-studio-marketplace/r/GerhardBrueckl.fabricstudio)](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio)

![Fabric Studio](./images/FabricStudio.png?raw=true "Fabric Studio")

A [VSCode](https://code.visualstudio.com/) extension for managing your Fabric tenant using the [Fabric REST API](https://learn.microsoft.com/en-us/rest/api/fabric/articles/) and modify Fabric items directly from within VSCode.

# Installation
The extensions can be installed directly from within VSCode by searching for this extension (`GerhardBrueckl.fabricstudio`) or downloaded from the official Visual Studio Code extension gallery at [Fabric Studio](https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio) and installed manually as `VSIX`.

# Features
- GUI to browse your workspace and artifacts - see [Workspace Browser](#workspace-browser)
- Custom FileSystemProvider for Fabric items (`fabric://`) from VSCode
  - create/update/delete
  - publish from VSCode to the Fabric Service
- Supports VSCode and [vscode.dev](https://vscode.dev) alike with all features also available in the web!
- Run arbitrary REST API calls in a notebook using `%api` magic - see [Notebooks](#notebooks)
- Integrate Fabric GIT APIs with VSCode GIT - see [Fabric GIT Integration](#fabric-git-integration)
- Connect to remote tenants where you are invited as a guest user - see [Configuration](#configuration)
- Soon to come:
  - GUI to manage Pipelines
  - Integration of [Fabric GraphQL](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-overview) in notebooks

# Configuration
The extension supports the following VSCode settings:

|Setting|Description|Example value|
|-------|-----------|-------------|
|`fabricstudio.tenantId`|(Optional) The tenant ID of the remote tenant that you want to connect to.|A GUID, `abcd1234-1234-5678-9abcd-9d1963e4b9f5`|
|`fabricstudio.clientId`|(Optional) A custom ClientID/Application of an AAD application to use when connecting to Fabric.|A GUID, `99887766-1234-5678-9abcd-e4b9f59d1963`|
|`fabric.workspaceFilter`|(Optional) A regex to filter workspaces by name. Only workspaces matching this regex will be shown in the Fabric Workspaces view.|`Project A\|Sales` to see only workspaces that have "Project A" or (\|) "Sales" in the name|
|`fabric.connectionFilter`|(Optional) A regex to filter connections. Only connections where the definition is matching this regex will be shown in the Fabric Studio Connections view.|```(\\.database\\.windows\\.net\|\\.dfs\\.core\\.windows\\.net)``` to see only connections to Azure SQL databases and ADLS Gen2 accounts|
|`fabric.capacityFilter`|(Optional) A regex to filter capacities. Only capacities where the definition is matching this regex will be shown in the Fabric Studio Capacities view.|```(F2\|West Europe)``` to see only capacities with SKU `F2` or are located in `West Europe`|
|`fabricstudio.itemTypeFormats`|(Optional) A list of [Fabric Item Types](https://learn.microsoft.com/en-us/rest/api/fabric/core/items/list-items?tabs=HTTP#itemtype) with an optional [Format](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/notebook-definition#supported-formats) as list of objects.|```[{"itemType": "Notebook", "format": "ipynb"}, {"itemType": "Report"}]```|
|`fabric.logLevel`|The log level to use for the extension. 0 = Off, 1 = Trace, 2 = Debug, 3 = Info, 4 = Warning, 5 = Error. Default is 3 (`Info`)|3|
|`fabric.iconStyle`|(Optional) Which set of icons to use for the different Fabric item types. Default is `mono`|`mono` or `color`|
|`fabricStudio.showProWorkspaces`|(Optional) Whether regular Pro workspaces without a capacity should be shown or not. This might make sense for Power BI items as you can still use the TMDL/PBIR editor of Fabric Studio. Default is `false`|`true` or `false`|

# Workspace Browser
![WorkspaceBrowser](./images/WorkspaceBrowser.png?raw=true "WorkspaceBrowser")
The workspace browser is usually the starting point for all activities. It allows you to browse through your Fabric workspaces, the individual items and sub-items and execute various action based on the current selection.
As of now, not most items are read-only but actions will be added in the future and when the Fabric REST APIs support them!

In case you have access to a lot of workspaces you can also filter them using the Workspace Filter. In addition, you can also opt in to show Pro workspaces (`fabricStudio.showProWorkspaces`) which are not assigned to a capacity to use TMDL and PBIR editor for existing Power BI items.

# API Notebooks
You can open a new Fabric notebook via the UI from the header of each treeview or by running the command **Open new Fabric Notebook** (command `FabricStudio.Item.openNewNotebook`). Fabric notebooks have the file extension `.fabnb` and will automatically open in the notebook editor.

The following features are supported by notebooks and can be used using magic tags in the first line of the cell:
- running arbitrary [REST API calls](#run-rest-api-calls-api) (magic `%api`)
- setting [variables](#using-variables-cmd) to be used in subsequent cells (magic `%cmd`)

There are also dedicated languages for each of the magics which you can also use see the rigth bottom of your notebook cell.
Next to the magic itself you can also specify a custom API endpoint for every cell right after the magic tag:

```rest
%api 
GET /workspaces
```

This overwrites the `API_PATH` set for the notebook to run DAX queries. You can now run multiple API calls against different endpoints from within the same notebook without changing the `API_PATH` every time. For example if you want to run the same query against `TEST` and `PROD` to compare results etc.

Custom API endpoints work for all magics except `%cmd` which does not interact with the API at all.

For proper visualization of the results I highly recommend to also install the [Data Table Renderers extension](https://marketplace.visualstudio.com/items?itemName=RandomFractalsInc.vscode-data-table)!

## Run REST API calls (%api)
To run a REST API call from the notebook you can simply write the following:

``` rest
METHOD endpoint
{JSON-Body}
```

For example to create a new dashboard in _My Workspace_ you can run the following command:

``` rest
POST /dashboards
{
  "name": "SalesMarketing"
}
```

The JSON-body can also be omitted, e.g. for a GET request.
Supported METHODs are `GET`, `POST`, `PUT`, `PATCH` and `DELETE`. the _endpoint_ can either be absolute (e.g. `https://api.fabric.microsoft.com/v1/workspaces`), relative to the root of the API (e.g. `/workspaces`) or relative to the path set via notebook variables `API_PATH` (e.g. `./items`) (see [Using Variables](#using-variables-cmd) below)

## Using variables (%cmd)
You can also define and use variables within the notebook. To set a variable you can use

``` bash
%cmd
MY_VARIABLE = my_value
```

Please note that variable names are note case sensitive and are converted to UPPER when you define them. However, you reference them using any casing you want.

There are some special variables that can be used to make your notebooks more generic.The main variable that needs to be set is the `API_PATH` (aliases are also `ROOT_PATH`or `API_ROOT_PATH`) to set the starting point for relative API paths:

``` bash
%cmd
SET API_PATH = /workspaces/d1f70e51-1234-1234-8e4c-55f35f9fa758
```

Relative API paths always start with `./`:

``` rest
GET ./notebooks
```

Current values of variables can be retrieved by running `SET MY_VARIABLE`.

Variables can be used via the pattern `$(<variableName>)`. Assuming the variable `My_Variable` is set to `123`:

``` dax
EVALUATE ROW("MyVariable", $(My_Variable))
```

**Note:** you can also set/get multiple variables within the same notebook cell!

### Special _cells variable
Another special variable is `_cells` which allows you to refernce the output of other cells. The full syntax is `_cells[<relativeCellIndex>]<XPathInResult>`. This variable can then be used like this:

``` bash
GET /groups
------ CELL -------
GET /groups/$(_cells[-1][2].id)/datasets
```

The first cell would return the list of all workspaces. The second cell gets the result of the previous cell (`[-1]`), and reads the `id` of the 3rd row (`[2].id`). This syntax can not only be used in the API path but anywhere in the cell, e.g. also in the body! To reference the whole output, you can also omi the `<XPathInResult>` and only use `_cells[<relativeCellIndex>]`.

This approach can also be used to simply copy settings from one Power BI object to another by first running a `GET` on the source object and then a `POST`/`PUT`/`PATCH` on the target referencing the output of the preceding `GET`. Common scenarios would be to copy users/permissions or dataset refresh schedules but there are definitely much more use-cases!

# Spark Notebooks
Fabric Studio also allows you to run Spark notebooks (`.ipynb`) against an existing Fabric Lakehouse (which acts as a Spark cluster). Whenever a Lakehouse is viewed/opened in the [Workspace Browser](#workspace-browser), a Kernel is added for that lakehouse which can then be used to run any `.ipynb` file against it. If you open a notebook directly from Fabric Studio, the notebook is automatically attached to the default-lakehouse associated with the notebook.

# Custom FileSystemProvider
The extension also provides an easy way to interact with all items hosted in Microsoft Fabric and modify their definition. You need to use a [VSCode Workspace](https://code.visualstudio.com/docs/editor/workspaces) for this to work properly.
The easiest way to configure and use the custom FileSystemProvider is to right-click the item (or parent or workspace) in the Workspace Browser and select `Edit Defintion`:
![EditDefinition](./images/EditDefinition.png?raw=true "Edit Definition")
Alternatively you can also add the path to your Fabric Workspace (or item) directly to your workspace settings file using an URI in the format of `fabric://workspaces/<workspace-guid>`:

```json
{
	"folders": [
		{
			"path": "."
		},
		{
			"uri": "fabric://workspaces/f6fb3aea-f11f-4f06-b6fa-89bac4c0fee0",
			"name": "My Fabric Workspace"
		}
	]
}
```

Once this is set up, you can browse your Fabric items as if they were local. In fact, we use the Fabric APIs to download them and cache them locally in memory for you. You can also add, modify or delete the Fabric items or modify individual definition files. As it is now like a local file system, you can also Drag&Drop or Copy&Paste between local folder structures and Fabric items or within Fabric - e.g. to copy an existing Fabric item!

Locally changed files will be displayed similar to changed items in GIT:

- green with `A` badge -> Added
- yellow with `M` badge -> Modified
- red with `D` badge -> Deleted

To publish your local changes back to Fabric, right-clicking on the Item-folder (e.g the Dataset, the Report, the Notebook, ...) and select `Publish to Fabric`.

To undo your local changes or force the reload of content from Fabric (e.g. if you changed/created a new item in the Fabric UI), you can use `Reload from Fabric` from the context menu.

# Fabric GIT Integration
If you have your Fabric workspace connected to a GIT repository, you can from now on start managing your GIT workflow from within VSCode. To do so, simply right-click the Fabric workspace and select `Manage Source Control`. This action will integrate your Fabric workspace GIT workflows into VSCode as if it were a regular repository.
![Manage-SourceControl](./images/Manage_SourceControl.png?raw=true "Manage SourceControl")
Once the GIT repository is managed via VSCode, you can stage, commit, undo your changes from within VSCode:
![SourceControl](./images/SourceControl.png?raw=true "SourceControl")

# Drag & Drop Capabilites
For usability, some items are configured for Drag & Drop.
The following list provides the currently supported souces and targets for Drag & Drop

| Source | Target | Action | Description |
|--------|--------|--------|-------------|
| Role Assignment | Role Assignments | Add RoleAssignment | Adds the dragged role assignment to the parent of `Role Assignments` folder where it is dropped. Works for Connection-, Workspace- and Gateway-roles|
| Workspace | Capacity | Assign to Capacity | Assigns the dragged workspace to the dropped capacity. |
| Workspace Folder | Workspace | Move folder | Moves the dragged folder to the root of the workspace |
| Workspace Folder | Workspace Folder | Move folder | Moves the dragged folder under the target folder |
| Item | Workspace Folder | Move item | Moves the selected items (multiselect!) to the target folder |

# FAQ

**Q: I have so many workspaces and its hard to find the one I need, what can I do?**

**A:** Please check the config setting `fabricStudio.workspaceFilter` to pre-filter workspaces. The filter can also be set via the Filter-icon at the top of the treeviews. Also, every treeview (like the Fabric Workspace Browser) in VSCode is searchable by default. Simply click into the treeview and press `CTRL + ALT + F` as you would do in any other application to start a search

**Q: I have a guest account in a remote client, can I still use this extension?**

**A:** Yes! The only thing you need to do is to specify the TenantID of the remote tenant in the setting `fabricStudio.tenantId`. I would recommend to create a separate VSCode workspace in this scenario and change the setting there.

**Q: I tried to run a command from the context menue but the dropdown that appears does not contain the values I want to use. What can I do?**

**A:** Unfortunately VSCode is quite limited in the way how users can enter data (e.g. a dropdown box) and we simply display the last 10 items that the user selected or expanded. So if you e.g. want to assign a workspace to a Capacity but the list is empty (or your Capacity does not show up), please navigate the the target item in the tree view and select it once. It then should show up in the drop-down. Most of those action can also be done by using drag-and-drop - see [Drag & Drop](#drag--drop-capabilites)

**Q: Something went wrong or the extension is stuck, what can I do?**

**A:** Unfortunately this can happen, sorry! You might try to restart VSCode. If the problem persists, please open an [issue](https://github.com/gbrueckl/FabricStudio/issues) at our Git Repository. You might want to also check the dedicated VSCode Output for Fabric Studio which can reveal more information about the problem. You can also change the `fabricStudio.logLevel` to `Debug` or `Trace`.
