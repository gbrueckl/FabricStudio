---
applyTo: "**/*.ts"
---

## 0. Project overview

Fabric Studio is a VSCode extension to surface the [Fabric REST APIs](https://aka.ms/Fabric-REST-API)

- **tree-views**: Tree-views provide an easy and intuitive way to navigate through the hierarchical structure of the Fabric REST APIs
- **virtual-file-system**: The FileSystemProvider allows you to interact with definition files provided by the API as if they were local

**Golden rule**: When unsure about implementation details or requirements, ALWAYS consult the developer rather than making assumptions.

---

## 1. Non-negotiable golden rules
- Always prefix your answers with ➡️ 

| #: | AI *may* do                                                            | AI *must NOT* do                                                                    |
|---|------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| G-0 | Whenever unsure about something that's related to the project, ask the developer for clarification before making changes.    |  ❌ Write changes or use tools when you are not sure about something project specific, or if you don't have context for a particular feature/decision. |
| G-1 | Generate code **only inside** relevant source directory `src/`  | ❌ Touch any files in the root of the repository. | |
| G-2 | Add/update **`AIDEV-NOTE:` anchor comments** near non-trivial edited code. | ❌ Delete or mangle existing `AIDEV-` comments.                                     |
| G-3 | Follow lint/style configs (`tslint.json`). Use the project's configured linter, if available, instead of manually re-formatting code. | ❌ Re-format code to any other style.                                               |
| G-4 | For changes >300 LOC or >3 files, **ask for confirmation**.            | ❌ Refactor large modules without human guidance.                                     |
| G-5 | Stay within the current task context. Inform the dev if it'd be better to start afresh.                                  | ❌ Continue work from a prior prompt after "new task" – start a fresh session.      |
| G-6 | Always prefix your answers with ➡️    | ❌ return an answer without a suffix     |



## 2. Build, test & utility commands

## 3. Coding standards

- **NodeJS**: v22.5.1
- **TypeScript**: use async when necessary
- **WebPack**: to bundle output into a single JS file
- **Naming**: `camelCase` (functions/variables), `PascalCase` (classes), `SCREAMING_SNAKE` (constants).
- **Documentation**: Google-style docstrings for public functions/classes.
- **Error Handling**: Should be done at the UI level

## 4. Project layout & Core Components

| Directory               | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `resources/`            | Resources to be distributed with the code.        |
| `images/`               | Images used in the VSCode Gallery                 |
| `src/`                  | Root of the actual source code                    |
| `utils/`                | various utilitiy functions not part of the code   |

See `instructions\architecture.instructions.md` for details.

---

## 5. Anchor comments

Add specially formatted comments throughout the codebase, where appropriate, for yourself as inline knowledge that can be easily searched for.

### Guidelines

- Use `AIDEV-NOTE:`, `AIDEV-TODO:`, or `AIDEV-QUESTION:` (all-caps prefix) for comments aimed at AI and developers.
- Keep them concise (≤ 120 chars).
- **Important:** Before scanning files, always first try to **locate existing anchors** `AIDEV-*` in relevant subdirectories.
- **Update relevant anchors** when modifying associated code.
- **Do not remove `AIDEV-NOTE`s** without explicit human instruction.
- Make sure to add relevant anchor comments, whenever a file or piece of code is:
  - too long, or
  - too complex, or
  - very important, or
  - confusing, or
  - could have a bug unrelated to the task you are currently working on.

Example:

```typescript
// AIDEV-NOTE: perf-hot-path; avoid extra allocations (see ADR-24)
async doSomething(...):
    ...
```

---

## 6. Commit discipline

- **Granular commits**: One logical change per commit.
- **Tag AI-generated commits**: e.g., `feat: optimise feed query [AI]`.
- **Clear commit messages**: Explain the *why*; link to issues/ADRs if architectural.
- **Use `git worktree`** for parallel/long-running AI branches (e.g., `git worktree add ../wip-foo -b wip-foo`).
- **Review AI-generated code**: Never merge code you don't understand.

---

## 7. Versioning conventions

The version of the project is maintained in the root `package.json` file. 
Changes are documented in `CHANGELOG.md` in the root directory.

The version number follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version update: For incompatible changes.
- **MINOR** version update: For adding functionality in a backward-compatible manner.
- **PATCH** version update: For backward-compatible bug fixes.
