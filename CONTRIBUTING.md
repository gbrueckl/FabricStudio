# Fabric Studio - Developer Guide

Fabric Studio is an open source project and contributions are highly welcome. Getting started should be quite easy as you only need to have two programs installed:

- [VSCode](https://code.visualstudio.com/)
- [NodeJS](https://nodejs.org/en/) - I currently use `v22.5.1`
- [NVM](https://github.com/coreybutler/nvm-windows) - (optional) to dynamically switch NodeJS versions

To start developing Fabric Studio on your own, you simply have to follow the steps below:
1. Make sure you have installed the tools from above on your development workstation
2. Clone this repo to your development workstation, then open the cloned folder in [VSCode](https://code.visualstudio.com/)
3. Install Visual Studio Code Extension Manager by running `npm install @vscode/vsce -g --force`
4. To install all dependencies, switch to the terminal and run `npm install`
5. Install the VSCode extension [TypeScript + Webpack Problem Matchers](https://marketplace.visualstudio.com/items?itemName=amodio.tsl-problem-matcher). Not sure if this is really mandatory but at the moment the `$ts-webpack-watch` problemMatcher is used in the `pre-build` task.
6. To run the extension in debug mode (for using break-points, etc.), press `F5`
7. To generate the `.vsix`, switch to the terminal and run `vsce package`

# VSCode Extension Development Details
Please refer to the [official docs and samples](https://github.com/microsoft/vscode-extension-samples#prerequisites)

# Contributing to Fabric Studio
There are a couple of core principals that should be followed when contributing to Fabric Studio. These principals are:

- every contribution must work with VSCode Desktop and also [VSCode Web](https://vscode.dev). This means that no native NodeJS modules must be used. Please use the VSCode built in wrappers instead - e.g. `vscode.workspace.fs` for everything related to the (local) file system like reading or writing files, etc.
- reuse of existing code. A lot of the existing code is highly nested based on object oriented programmig (OOP) and inheritance. This makes it easy to add generic features to all tree items (via `FabricApiTreeItem.ts`) or to all workspace tree items (via `FabricWorkspaceTreeItem.ts`), etc.
- follow existing styles and coding patterns / regularly format your code (context menu in the editor -> `Format Document`)

## Things to know

Testing and debugging is a crucial part during development. To offer a consistent experience, we open the same VSCode workspace everytime we start a new debugging session. The workspace to be opened has to be stored under `/utils/Fabric_Studio.test.code-workspace` and is individual to every developer and not part of the git repository.
