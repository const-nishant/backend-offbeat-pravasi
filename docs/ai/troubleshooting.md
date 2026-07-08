# Troubleshooting

## MCP Servers

### code-review-graph MCP fails to start

```
Error: code-review-graph: command not found
```

**Solution:** Ensure `code-review-graph` is installed and on PATH:

```bash
code-review-graph --version
```

Install via cargo if missing:

```bash
cargo install code-review-graph
```

### ast-grep MCP fails to start

```
Error: Cannot find module 'ast-grep-mcp'
```

**Solution:** Reinstall the dev dependency:

```bash
npm install --save-dev ast-grep-mcp
```

### ast-grep binary not resolved by ast-grep-mcp

Run the version tool to debug:

```bash
# Via MCP: call ast_grep_version tool
# Or check PATH:
ast-grep --version
```

The server resolves in this order: `AST_GREP_BIN` env → `ast-grep` on PATH → `sg` on PATH (if it's ast-grep) → bundled `@ast-grep/cli`.

## Repository Graph

### Graph build fails

```
Error: No such file or directory
```

**Solution:** Ensure the build command runs from the repo root:

```bash
cd /path/to/backend-offbeat-pravasi
npm run graph
```

### Graph is stale

Run incremental update:

```bash
npm run repo:index
```

Or rebuild from scratch:

```bash
npm run graph
```

## ripgrep

### PCRE2 not available

The installed ripgrep build lacks PCRE2. For look-ahead/back references, use ast-grep or the bundled `@ast-grep/cli` instead.

## Common Issues

### "Tool not found" when running npm scripts

Ensure `node_modules/.bin` is in PATH, or use `npx`:

```bash
npx code-review-graph build
```

### OpenCode does not detect opencode.json

The config file must be in the project root. Verify:

```bash
ls opencode.json
```

Run `/init` in OpenCode to reinitialize if needed.

### MCP servers not appearing in tool list

1. Verify `opencode.json` syntax is valid JSON.
2. Restart OpenCode session.
3. Check MCP server processes are running:

```bash
# code-review-graph MCP
code-review-graph mcp --help

# ast-grep MCP
npx ast-grep-mcp
```

## Agent Skills

### Skill not showing up in tool list

1. Verify `SKILL.md` is spelled in all caps (not `skill.md` or `SKILL.MD`).
2. Ensure frontmatter has both `name` and `description` fields.
3. Directory name must match the `name` field (lowercase alphanumeric with hyphens).
4. Check permissions in `opencode.json`: `permission.skill."*"` should be `"allow"`.
5. Restart OpenCode session to reload skills.

### Skill file validation errors

- Name must be 1–64 lowercase alphanumeric characters with single hyphen separators.
- Description must be 1–1024 characters.
- File must be at `.agents/skills/<name>/SKILL.md`.

## Package-Specific Links

| Tool | Docs |
|------|------|
| code-review-graph | https://github.com/anomalyco/code-review-graph |
| ast-grep | https://ast-grep.github.io/ |
| ast-grep-mcp | https://github.com/ianpascoe/ast-grep-mcp |
| repomix | https://github.com/yamadashy/repomix |
| OpenCode MCP | https://opencode.ai/docs/mcp-servers/ |
