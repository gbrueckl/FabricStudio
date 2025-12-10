# Fabric Studio - AI Coding Assistant Guide

## Project Overview
Fabric Studio is a VSCode extension that surfaces Microsoft Fabric REST APIs through tree views, a virtual file system, and custom notebook support. It enables browsing, editing, and managing Fabric workspaces directly from VSCode.

## Critical Architecture Knowledge

### Core Components Structure
- **`src/extension.ts`**: Main extension entry point with activation logic
- **`src/ThisExtension.ts`**: Central extension controller managing all providers and state
- **`src/env/`**: Environment-specific abstractions for Node.js vs Web. Never touch this directly
- **`src/fabric/`**: Core Fabric API integration and data models
- **`src/fabric/FabricApiService.ts`**: Encapsulates ALL Fabric REST API access - never bypass this when calling APIs
- **`src/fabric/_types.ts`**: TypeScript interfaces/types for Fabric API responses
- **`src/utils`**: Utility functions shared across the project
- **`src/vscode/`**: VSCode-specific integrations organized by feature:
  - `configuration/`: Abstraction layer over VSCode settings
  - `treeviews/`: Hierarchical explorers for workspaces, connections, capacities, admin, etc. Server as an entry point for the user
  - `filesystemProvider/`: Virtual file system (`fabric://` scheme) with caching
  - `notebook/`: Custom ingegrations to work with notebooks within VSCode
    - `spark/`: Spark kernel integration for executing code against Fabric Spark clusters
    - `api/`: Custom `.fabnb` notebook support with magic commands. Used to run arbitrary Fabric REST API calls from the notebook
  - `uriHandler/`: Custom URI scheme handling for `fabric://` links
  - `sourceControl/`: Fabric GIT integration
- **`utils/`**: Various utility functions not part of the core code
- **`resources/`**: Static assets like icons and images, not part of the core code
- **`images/`**: Static images used in the VSCode Gallery, not part of the core code

### Key Patterns & Inheritance Hierarchy
The code heavily uses inheritance to share logic across similar components. Key tree item hierarchy:
```typescript
FabricApiTreeItem                       // Base for all tree items
├── FabricWorkspaceTreeItem             // Base for workspace-scoped items
│   ├── FabricWorkspace                 // Workspace container
│   ├── FabricItem                      // Generic Fabric item
│   │   └── FabricDataPipeline          // DataPipeline-specific logic
│   │   ├── FabricNotebook              // Notebook-specific logic
│   │   └── FabricLakehouse             // Lakehouse-specific logic
│   ├── FabricWorkspaceGenericFolder    // Base for generic workspace folders
│   └── FabricWorkspaceFolder           // WorkspaceFolder-specific logic
├── FabricConnectionTreeItem            // Connection management
└── FabricCapacityTreeItem              // Capacity management
```
Treeview items are always implemented as independent classes extending from these base classes. The hierarchy of items and folders only contains one level. If more levels are needed, create additional item classes or use the generic folder classes.

### Environment & Build Dual-Target
**Critical**: Extension supports both VSCode Desktop and Web (vscode.dev):
- Use `@env/fetch` for HTTP requests, never native Node.js modules
- Use `vscode.workspace.fs` for file operations, never Node.js `fs`
- TypeScript path aliases: `@env/*` (environment-specific), `@utils/*` (shared utilities)
- Webpack builds separate bundles: `dist/node/` and `dist/web/`

## Developer Workflows

### Build & Debug
```bash
npm install                   # Install dependencies
npm run watch                 # Start TypeScript compiler in watch mode
F5                            # Launch extension host for debugging
vsce package                  # Generate .vsix for distribution
```

### Testing Setup
- Debug workspace: `utils/Fabric_Studio.test.code-workspace` (local, not in git)
- Pre-build task uses `$ts-webpack-watch` problem matcher
- Extension host automatically opens test workspace

## Code Standards & Conventions

### Naming & Structure
- **camelCase**: functions, variables
- **PascalCase**: classes, interfaces (prefix with `i` for interfaces)
- **SCREAMING_SNAKE**: constants
- **File organization**: Group by feature, inherit from base classes

### Anchor Comments (Required)
Add `AIDEV-NOTE:`, `AIDEV-TODO:`, `AIDEV-QUESTION:` for complex/important code:
```typescript
// AIDEV-NOTE: FileSystemProvider requires caching for performance with large workspaces
class FabricFSCache {
    // ...
}
```

### Error Handling
- UI-level error handling preferred
- Use TypeScript async/await consistently
- Leverage VSCode's built-in error reporting

## Key Integration Points

### Authentication & API Access
- `FabricApiService` handles OAuth via `vscode.authentication`
- Configuration in `FabricConfiguration` (tenant ID, client ID, filters)
- All API calls go through `FabricApiService` - maintains sessions, headers, polling

### Virtual File System (`fabric://` scheme)
- URI format: `fabric://workspaces/{guid}[/items/{guid}[/definition/{part}]]`
- `FabricFSCache` provides performance layer over API calls
- `FabricFSUri` handles URI parsing and validation
- Supports drag-and-drop, file decoration (A/M/D badges)

### Tree View Providers
```typescript
// Register pattern used across all tree providers
vscode.window.createTreeView('fabricstudioworkspaces', {
    treeDataProvider: new FabricWorkspacesTreeProvider(),
    dragAndDropController: new FabricDragAndDropController()
});
```


## Project-Specific Gotchas

### Configuration Filters
Users can filter displayed items via regex patterns:
- `fabric.workspaceFilter`: Filter workspaces by name
- `fabric.connectionFilter`: Filter connections by definition
- Settings affect tree provider data, not just UI display

### Drag & Drop Capabilities
Implemented via `FabricDragAndDropController`
Specific source→target mappings implemented:
- Role Assignment → Role Assignments (add to parent)
- Workspace → Capacity (assign workspace)

### TypeScript Path Resolution
```typescript
// Correct imports based on target environment
import { fetch } from '@env/fetch';        // Environment-specific
import { Helper } from '@utils/Helper';    // Shared utilities
```

### Context Values & Commands
Tree items use `contextValue` for command visibility within the tree view.
This is defined by `package.json` contributes section.
The value of `contextValue` must match whats defined in `package.json`.
`ContextValue` is dynamically constructed and can contain multiple values separated by `,`.
`package.json` uses a regex-like syntax to match specific context values:
```json
{
  "command": "FabricStudio.Item.editDefinition",
  "when": "view == FabricStudioWorkspaces && viewItem =~ /.*,EDIT_DEFINITION,.*/",
  "group": "2_edit"
},
```
In the above example, the command will be visible for any tree item in the `FabricStudioWorkspaces` view that has `EDIT_DEFINITION` as part of its `contextValue`.

## Common Development Tasks

### Adding New Tree Item Types
1. Extend `FabricApiTreeItem` or appropriate subclass (e.g. `FabricWorkspaceTreeItem`)
2. Implement required abstract methods (`getChildren`)
3. Implement item specific commands, logic and properties
4. Add the new tree item to the appropriate parent by adding it in `getChildren` method

### Adding API Endpoints
1. Add types to `src/fabric/_types.ts`
2. Implement methods in `FabricApiService.ts`
3. Use existing polling/error handling patterns
4. You can reference `/ressources/API/swagger.json` for the full API spec or refere to underlying [GitHub repository](https://github.com/microsoft/fabric-rest-api-specs)

## Documentation Requirements
- Update `AIDEV-*` anchor comments when modifying complex code
- Follow existing patterns for consistency
- Reference `AGENT.md` for detailed coding standards
