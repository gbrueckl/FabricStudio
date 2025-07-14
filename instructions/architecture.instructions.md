# Fabric Studio - AI Coding Assistant Guide

## Project Overview
Fabric Studio is a VSCode extension that surfaces Microsoft Fabric REST APIs through tree views, a virtual file system, and custom notebook support. It enables browsing, editing, and managing Fabric workspaces directly from VSCode.

## Critical Architecture Knowledge

### Core Components Structure
- **`src/extension.ts`**: Main extension entry point with activation logic
- **`src/ThisExtension.ts`**: Central extension controller managing all providers and state
- **`src/fabric/FabricApiService.ts`**: Encapsulates ALL Fabric REST API access - never bypass this
- **`src/vscode/`**: VSCode-specific integrations organized by feature:
  - `treeviews/`: Hierarchical explorers for workspaces, connections, capacities, admin
  - `filesystemProvider/`: Virtual file system (`fabric://` scheme) with caching
  - `notebook/`: Custom `.fabnb` notebook support with magic commands
  - `sourceControl/`: Fabric GIT integration

### Key Patterns & Inheritance Hierarchy
```typescript
FabricApiTreeItem                    // Base for all tree items
├── FabricWorkspaceTreeItem         // Base for workspace-scoped items
│   ├── FabricWorkspace            // Workspace container
│   ├── FabricItem                 // Generic Fabric item
│   ├── FabricNotebook             // Notebook-specific logic
│   └── FabricLakehouse            // Lakehouse-specific logic
├── FabricConnectionTreeItem        // Connection management
└── FabricCapacityTreeItem         // Capacity management
```

### Environment & Build Dual-Target
**Critical**: Extension supports both VSCode Desktop and Web (vscode.dev):
- Use `@env/fetch` for HTTP requests, never native Node.js modules
- Use `vscode.workspace.fs` for file operations, never Node.js `fs`
- TypeScript path aliases: `@env/*` (environment-specific), `@utils/*` (shared utilities)
- Webpack builds separate bundles: `dist/node/` and `dist/web/`

## Developer Workflows

### Build & Debug
```bash
npm install                    # Install dependencies
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

### Custom Notebooks (`.fabnb`)
- `%api`: Execute Fabric REST API calls with syntax highlighting
- `%cmd`: Set variables (e.g., `API_PATH`) for subsequent cells
- `_cells[index]` references for chaining cell outputs
- JSON/table rendering via external extensions

## Project-Specific Gotchas

### Configuration Filters
Users can filter displayed items via regex patterns:
- `fabric.workspaceFilter`: Filter workspaces by name
- `fabric.connectionFilter`: Filter connections by definition
- Settings affect tree provider data, not just UI display

### Drag & Drop Capabilities
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
Tree items use `contextValue` for command visibility:
```typescript
// Commands registered with specific context requirements
this.contextValue = `fabricItem.${this.itemType}.${this.subItemType}`;
```

## Common Development Tasks

### Adding New Tree Item Types
1. Extend `FabricApiTreeItem` or appropriate subclass
2. Implement required abstract methods (`getChildren`, `getIconPath`)
3. Register context commands in `package.json`
4. Add to appropriate tree provider

### Adding API Endpoints
1. Add types to `src/fabric/_types.ts`
2. Implement methods in `FabricApiService.ts`
3. Use existing polling/error handling patterns

### Cross-Environment Compatibility
Always test both desktop and web builds - web environment has limited APIs and different bundling requirements.

## Documentation Requirements
- Update `AIDEV-*` anchor comments when modifying complex code
- Follow existing patterns for consistency
- Reference `AGENT.md` for detailed coding standards
