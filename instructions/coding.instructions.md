# AGENTS.md
*Last updated 2025-05-09*  
Source (just for refernce): <https://raw.githubusercontent.com/julep-ai/julep/refs/heads/main/AGENTS.md>

> **purpose** – This file is the onboarding manual for every AI assistant (Claude, Cursor, GPT, etc.) and every human who edits this repository.  
> It encodes our coding standards, guard-rails, and general project specifications

---

## 0. Project overview

Fabric Studio is a VSCode extension to surface the [Fabric REST APIs](https://aka.ms/Fabric-REST-API)

- **tree-views**: Tree-views provide an easy and intuitive way to navigate through the hierarchical structure of the Fabric REST APIs
- **virtual-file-system**: The FileSystemProvider allows you to interact with definition files provided by the API as if they were local

**Golden rule**: When unsure about implementation details or requirements, ALWAYS consult the developer rather than making assumptions.

---

## 1. Non-negotiable golden rules

| #: | AI *may* do                                                            | AI *must NOT* do                                                                    |
|---|------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| G-0 | Whenever unsure about something that's related to the project, ask the developer for clarification before making changes.    |  ❌ Write changes or use tools when you are not sure about something project specific, or if you don't have context for a particular feature/decision. |
| G-1 | Generate code **only inside** relevant source directory `src/`  | ❌ Touch any files in the root of the repository. | |
| G-2 | Add/update **`AIDEV-NOTE:` anchor comments** near non-trivial edited code. | ❌ Delete or mangle existing `AIDEV-` comments.                                     |
| G-3 | Follow lint/style configs (`tslint.json`). Use the project's configured linter, if available, instead of manually re-formatting code. | ❌ Re-format code to any other style.                                               |
| G-4 | For changes >300 LOC or >3 files, **ask for confirmation**.            | ❌ Refactor large modules without human guidance.                                     |
| G-5 | Stay within the current task context. Inform the dev if it'd be better to start afresh.                                  | ❌ Continue work from a prior prompt after "new task" – start a fresh session.      |

---

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

See `CONTRIBUTING.md` for a full architecture diagram.

---

## 5. Anchor comments

Add specially formatted comments throughout the codebase, where appropriate, for yourself as inline knowledge that can be easily `grep`ped for.

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

```python
# AIDEV-NOTE: perf-hot-path; avoid extra allocations (see ADR-24)
async def do_something(...):
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

## 7. Fabric REST API

- All access to the Fabric REST APIs is encapsulated in `src\fabric\FabricApiService.ts`
- Data contracts are defined in `src\fabric\_types.ts`

## 10. Directory-Specific AGENTS.md Files

- **Always check for `AGENTS.md` files in specific directories** before working on code within them. These files contain targeted context.
- If a directory's `AGENTS.md` is outdated or incorrect, **update it**.
- If you make significant changes to a directory's structure, patterns, or critical implementation details, **document these in its `AGENTS.md`**.
- If a directory lacks a `AGENTS.md` but contains complex logic or patterns worth documenting for AI/humans, **suggest creating one**.

---

## 11. Common pitfalls

- Mixing pytest & ward syntax (ward uses `@test()` decorator, not pytest fixtures/classes).
- Forgetting to `source .venv/bin/activate`.
- Wrong current working directory (CWD) or `PYTHONPATH` for commands/tests (e.g., ensure you are in `agents-api/` not root for some `agents-api` tasks).
- Large AI refactors in a single commit (makes `git bisect` difficult).
- Delegating test/spec writing entirely to AI (can lead to false confidence).
- **Note about `src/`**: Only the `cli` component has a `src/` directory. For `agents-api`, code is directly in `agents_api/`. Follow the existing pattern for each component.

---

## 12. Versioning conventions

Components (e.g., `agents-api`, `julep-cli`, `integrations-service`) are versioned independently. Semantic Versioning (SemVer: `MAJOR.MINOR.PATCH`) is generally followed, as specified in each component's `pyproject.toml` file.

- **MAJOR** version update: For incompatible changes.
- **MINOR** version update: For adding functionality in a backward-compatible manner.
- **PATCH** version update: For backward-compatible bug fixes.

---

## 13. Key File & Pattern References

This section provides pointers to important files and common patterns within the codebase.

- **API Route Definitions**:
  - Location: `agents-api/routers/` (e.g., `agents-api/routers/sessions.py`)
  - Pattern: FastAPI routers, Pydantic models for request/response, dependency injection.
- **Typed Exceptions**:
  - Location: `agents-api/common/exceptions/`
  - Pattern: Custom exception classes inheriting from base exceptions.
- **Pydantic Models**:
  - Location: Used extensively across services, often in `models.py` files within component directories (e.g., `agents_api/common/protocol/`), or directly in router/activity files.
  - Pattern: Data validation, serialization, and settings management.
- **Temporal Workflows & Activities**:
  - Location: `agents-api/workflows/` (workflow definitions) and `agents-api/activities/` (activity implementations).
  - Pattern: Define complex, stateful operations using Temporal's primitives.
- **Database Queries & Models (Memory Store)**:
  - Location: `agents-api/queries/` (for SQL query builders/files) and `memory-store/` (for schema migrations).
  - Pattern: Asyncpg for database interaction, often with helper functions for CRUD operations.

---

## 14. Domain-Specific Terminology

- **Agent**: An AI entity with specific instructions, tools, and capabilities, defined via API. Core model in `typespec/agents/models.tsp`.
- **Task**: A definition of a workflow composed of multiple steps that an agent can execute. Core model in `typespec/tasks/models.tsp`.
- **Tool**: A specific capability or integration an agent can use (e.g., web search, API call). Defined in `typespec/tools/`.
- **Session**: A container for a sequence of interactions (entries) with an agent, maintaining context. Core model in `typespec/sessions/models.tsp`.
- **Entry**: A single message or event within a session (e.g., user input, agent response). Core model in `typespec/entries/models.tsp`.
- **Execution**: The runtime instance and state of a task being performed by an agent. Core model in `typespec/executions/models.tsp`.
- **POE (PoeThePoet)**: The task runner used in this project for development tasks like formatting, linting, testing, and code generation (configured in `pyproject.toml`).
- **TypeSpec**: The language used to define API schemas. It is the source of truth for API models, which are then generated into Python Pydantic models in `autogen/` directories.
- **Ward**: The primary Python testing framework used for unit and integration tests in most components (e.g., `agents-api`, `cli`).
- **Temporal**: The distributed workflow engine used to orchestrate complex, long-running tasks and ensure their reliable execution.
- **AIDEV-NOTE/TODO/QUESTION**: Specially formatted comments to provide inline context or tasks for AI assistants and developers.

---

## 15. Meta: Guidelines for updating AGENTS.md files

### Elements that would be helpful to add

1. **Decision flowchart**: A simple decision tree for "when to use X vs Y" for key architectural choices would guide my recommendations.
2. **Reference links**: Links to key files or implementation examples that demonstrate best practices.
3. **Domain-specific terminology**: A small glossary of project-specific terms would help me understand domain language correctly.
4. **Versioning conventions**: How the project handles versioning, both for APIs and internal components.

### Format preferences

1. **Consistent syntax highlighting**: Ensure all code blocks have proper language tags (`python`, `bash`, etc.).
2. **Hierarchical organization**: Consider using hierarchical numbering for subsections to make referencing easier.
3. **Tabular format for key facts**: The tables are very helpful - more structured data in tabular format would be valuable.
4. **Keywords or tags**: Adding semantic markers (like `#performance` or `#security`) to certain sections would help me quickly locate relevant guidance.


---

## 16. Files to NOT modify

These files control which files should be ignored by AI tools and indexing systems:

- @.agentignore : Specifies files that should be ignored by the IDE, including:
  - Build and distribution directories
  - Environment and configuration files
  - Large data files (parquet, arrow, pickle, etc.)
  - Generated documentation
  - Package-manager files (lock files)
  - Logs and cache directories
  - IDE and editor files
  - Compiled binaries and media files

- @.agentindexignore : Controls which files are excluded from indexing to improve performance, including:
  - All files in `.agentignore`
  - Files that may contain sensitive information
  - Large JSON data files
  - Generated TypeSpec outputs
  - Memory-store migration files
  - Docker templates and configuration files

**Never modify these ignore files** without explicit permission, as they're carefully configured to optimize IDE performance while ensuring all relevant code is properly indexed.

**When adding new files or directories**, check these ignore patterns to ensure your files will be properly included in the IDE's indexing and AI assistance features.

---

## AI Assistant Workflow: Step-by-Step Methodology

When responding to user instructions, the AI assistant (Claude, Cursor, GPT, etc.) should follow this process to ensure clarity, correctness, and maintainability:

1. **Consult Relevant Guidance**: When the user gives an instruction, consult the relevant instructions from `AGENTS.md` files (both root and directory-specific) for the request.
2. **Clarify Ambiguities**: Based on what you could gather, see if there's any need for clarifications. If so, ask the user targeted questions before proceeding.
3. **Break Down & Plan**: Break down the task at hand and chalk out a rough plan for carrying it out, referencing project conventions and best practices.
4. **Trivial Tasks**: If the plan/request is trivial, go ahead and get started immediately.
5. **Non-Trivial Tasks**: Otherwise, present the plan to the user for review and iterate based on their feedback.
6. **Track Progress**: Use a to-do list (internally, or optionally in a `TODOS.md` file) to keep track of your progress on multi-step or complex tasks.
7. **If Stuck, Re-plan**: If you get stuck or blocked, return to step 3 to re-evaluate and adjust your plan.
8. **Update Documentation**: Once the user's request is fulfilled, update relevant anchor comments (`AIDEV-NOTE`, etc.) and `AGENTS.md` files in the files and directories you touched.
9. **User Review**: After completing the task, ask the user to review what you've done, and repeat the process as needed.
10. **Session Boundaries**: If the user's request isn't directly related to the current context and can be safely started in a fresh session, suggest starting from scratch to avoid context confusion.
