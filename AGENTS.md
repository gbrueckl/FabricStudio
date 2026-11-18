# AGENTS.md

Guidance for AI coding agents working in this repo. For human-oriented setup/debugging instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is

Fabric Studio is a VS Code extension (`gerhardbrueckl.fabricstudio`) for managing and developing Microsoft Fabric. It ships as **two separate bundles from one source tree**: a Node build for VS Code Desktop and a web-worker build for [vscode.dev](https://vscode.dev). Both are built from the same `src/`, so every change must work in both.

## Build / verify loop

```
npx tsc --noEmit -p .              # type-check only, fastest feedback
npm run compile                    # webpack build, both targets (dev mode, source maps)
npm run package                    # same, production mode (minified) - what CI publishes from
npm run lint                       # eslint src --ext ts
```

There is no automated test suite (`npm run test` wires up `@vscode/test-web` but no test files exist in this repo). Verification is: type-check clean, both webpack targets compile clean, and manual exercise of the changed command/flow in a real install.

To install your build locally and actually exercise it (required before calling a change done - a clean compile does not prove the feature works):

```
npx vsce package --no-dependencies -o /tmp/fabricstudio-test.vsix
code --install-extension /tmp/fabricstudio-test.vsix --force
```

Then reload the VS Code window (`Developer: Reload Window`) to pick up the new build.

## The node/web split - the thing most likely to bite you

Webpack (`webpack.config.js`) builds two configs from the same `entry: ./src/extension.ts`:

- **node** target → `dist/node/extension.js`, aliases `@env` to `src/env/node/`
- **web** (webworker) target → `dist/web/extension.js`, aliases `@env` to `src/env/web/`

Any code that needs something not available in a browser sandbox (filesystem paths outside `vscode.workspace.fs`, child processes, `os`, native modules) **must not call that API directly** - add a function to both `src/env/node/*.ts` and `src/env/web/*.ts` (the web version typically no-ops or returns `undefined`/throws "not supported in web"), import it via `@env/<module>`, and call that instead. Forgetting the web stub compiles fine for node and silently breaks (or fails to compile) the web target. Always run `npm run compile` (builds both) before considering a platform-touching change done, not just `tsc`.

`@utils` is a second alias, pointing at `src/utils/` for both targets (shared, platform-agnostic helpers - no node/web split needed there).

## Source layout

- `src/vscode/treeviews/Workspaces/` - the Fabric workspace tree view (workspaces, items, jobs, etc.). Heavily OOP/inheritance-based: generic tree-item behavior lives in `FabricApiTreeItem.ts` / `FabricWorkspaceTreeItem.ts`; most item types subclass one of those rather than reimplementing behavior.
- `src/vscode/filesystemProvider/` - the virtual Fabric filesystem (`FABRIC_SCHEME`) that backs live, in-place editing of Fabric items (semantic models, reports, notebooks, etc.) as if they were local files.
- `src/fabric/FabricApiService.ts` - the Fabric REST API client (auth, requests, item definition get/update).
- `src/vscode/configuration/FabricConfiguration.ts` - all `fabricStudio.*` settings, including cloud/tenant config (`CLOUD_CONFIGS`).
- `src/utils/` - shared helpers: `PowerBI.ts` (PBIP download/upload), `Helper.ts` (generic utilities), etc.
- `src/env/node/` and `src/env/web/` - the platform split described above.
- `src/vscode/languageModelTools/` - tools exposed to VS Code's Language Model / Copilot Chat API.

## Contribution conventions (from the maintainer)

- PRs target `main`.
- Every bugfix or feature PR bumps `"version"` in `package.json`: patch version (`x.y.Z`) for bug fixes, minor version (`x.Y.0`) for new features.
- Add a matching entry at the **top** of `CHANGELOG.md` (capitalized filename) describing the change.
- Reuse existing patterns/class hierarchies rather than introducing new ones; match existing code style (VS Code's "Format Document").
- Never use Node-only APIs directly in code that isn't already behind the `@env` split - see above.
- `.github/workflows/create_release_and_publish.yaml` runs on push to `main` and publishes to the VS Code Marketplace and Open VSX using the `package.json` version, then tags a GitHub Release from `CHANGELOG.md`.
