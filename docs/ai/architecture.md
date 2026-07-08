# AI Architecture

## Repository Structure

```
.
├── .agents/               # Agent skill definitions and runbooks
├── .opencode/             # OpenCode local configuration (plugins, agents)
├── docker/                # Dockerfiles
├── docs/                  # Documentation
│   └── ai/                # AI tooling documentation (this directory)
├── postman/               # Postman collections
├── scripts/               # Helper scripts
├── src/                   # Application source
│   ├── modules/           # NestJS modules (auth, users, treks, bookings, etc.)
│   ├── common/            # Shared utilities, guards, interceptors
│   ├── config/            # Configuration modules
│   └── main.ts            # Application entry point
├── test/                  # Test files
├── opencode.json           # OpenCode MCP server configuration
├── AGENTS.md              # Agent definitions and workflow rules
└── nest-cli.json          # NestJS CLI configuration
```

## MCP Architecture

```
┌─────────────────────────────────────────────────┐
│                  OpenCode Agent                   │
│  (Code modifications, question answering, etc.)  │
└──────────┬──────────────────────────┬────────────┘
           │                          │
    ┌──────▼──────┐          ┌───────▼───────┐
    │ code-review │          │  ast-grep MCP │
    │ graph MCP   │          │  Server       │
    │ (stdio)     │          │  (stdio)      │
    └──────┬──────┘          └───────┬───────┘
           │                          │
    ┌──────▼──────┐          ┌───────▼───────┐
    │ code-review │          │   ast-grep    │
    │ graph (CLI) │          │   CLI (23MiB) │
    └─────────────┘          └───────────────┘
```

- Both MCP servers communicate over stdio — no network ports opened.
- `ast-grep-mcp` resolves the `ast-grep` binary via PATH, `AST_GREP_BIN`, or its bundled `@ast-grep/cli`.
- `code-review-graph mcp` uses the installed `code-review-graph` binary.

## Agent Skills

Skills are stored in `.agents/skills/<name>/SKILL.md` and discovered automatically by OpenCode. Each skill provides domain-specific guidance loaded on-demand via the `skill` tool:

- `bullmq-specialist` — BullMQ/Redis queue design patterns, job configuration, worker best practices
- `nestjs-best-practices` — NestJS architecture, DI, security, testing, performance
- `typeorm` — Entity definitions, relationships, migrations, query optimization

## Tool Integration Points

| Tool | Integration | How AI Agent Uses It |
|------|-------------|---------------------|
| `code-review-graph` | MCP server + npm script | Query graph for affected modules before edits |
| `ast-grep` | MCP server + direct CLI | Structural search for symbols, decorators, entities |
| `repomix` | npm script | Pack entire repo context for LLM batch analysis |
| `ripgrep` | Direct CLI | Fallback text search |
| `fd` | Direct CLI | Fast file discovery |
| TypeScript LSP | Built-in OpenCode LSP client | Go-to-definition, references, renaming |
