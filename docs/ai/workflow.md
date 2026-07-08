# Repository Intelligence Workflow

This is the single source of truth for minimizing context usage when an AI agent works on this repository.

## Escalation Order

```
graph → AST → LSP → ripgrep → full read
```

### 1. Build/Update Repository Graph

```bash
npm run graph
```

Use `code-review-graph` to build a dependency graph of the repository. Query this graph before opening files to understand module boundaries, dependencies, and affected files.

### 2. AST Search (ast-grep)

Use structural pattern matching to locate:

- Symbols, decorators, providers
- Repositories, DTOs, entities
- Queue definitions, services, controllers
- Imports and exports

Pattern format: `ast_grep_search` via MCP tool, or CLI:

```bash
ast-grep run --pattern '$DECORATOR() class $NAME { $$$ }' --lang ts
```

### 3. TypeScript Language Server

For deeper code navigation — definitions, references, rename, call hierarchy.

### 4. ripgrep (Fallback)

Use only for simple text searches or when AST tools are unavailable:

```bash
rg "pattern" --type ts
```

### 5. Read Only What's Needed

After identifying the exact files, read them in full. Never scan the entire repository.

## Why This Order

| Method | Context Cost | Precision |
|--------|-------------|-----------|
| Graph | Low | High (dependency-aware) |
| AST search | Low | Very High (structure-aware) |
| LSP | Medium | Very High (semantics-aware) |
| ripgrep | Low | Medium (text-only) |
| Full read | High | Highest |

Each step narrows the search space before the next, progressively reducing the number of files that need to be read in full.
