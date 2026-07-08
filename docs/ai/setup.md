# AI Environment Setup

## Installed Tools

| Tool | Version | Purpose |
|------|---------|---------|
| [ripgrep](https://github.com/BurntSushi/ripgrep) | 15.1.0 | Fast recursive text search |
| [fd](https://github.com/sharkdp/fd) | 10.4.2 | Fast file discovery |
| [ast-grep](https://ast-grep.github.io/) | 0.44.1 | AST-based structural code search and rewrite |
| [ast-grep-mcp](https://github.com/ianpascoe/ast-grep-mcp) | 0.0.2 | MCP stdio server wrapping ast-grep |
| [repomix](https://github.com/yamadashy/repomix) | 1.16.0 | Repository context packing for LLMs |
| [code-review-graph](https://github.com/anomalyco/code-review-graph) | 2.3.6 | Repository knowledge graph and change detection |
| [gh (GitHub CLI)](https://cli.github.com/) | 2.87.3 | GitHub operations (optional) |
| TypeScript | 5.7.3 | Language server and type checking |

## MCP Servers

Registered in `opencode.json`:

### code-review-graph
- **Command:** `code-review-graph mcp`
- **Purpose:** Provides repository graph queries and change detection tools to the AI agent.

### ast-grep
- **Command:** `npx ast-grep-mcp`
- **Purpose:** Provides AST structural search and safe rewrite tools to the AI agent.

## Commands

| Command | Action |
|---------|--------|
| `npm run graph` | Build/rebuild the code-review-graph |
| `npm run graph:watch` | Watch mode for graph updates |
| `npm run repo:summary` | Generate LLM-friendly repo summary with repomix |
| `npm run repo:index` | Incremental graph update |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Agent Skills

OpenCode discovers skills from `.agents/skills/*/SKILL.md` automatically. All skills are allowed by default (see `permission.skill` in `opencode.json`).

| Skill | Description | Location |
|-------|-------------|----------|
| `auth-security` | Authentication (JWT, OAuth, OTP) and authorization (guards, roles) patterns | `.agents/skills/auth-security/SKILL.md` |
| `api-design` | RESTful API conventions: DTOs, validation, serialization, versioning | `.agents/skills/api-design/SKILL.md` |
| `bullmq-specialist` | BullMQ expert for Redis-backed job queues, background processing, and reliable async execution | `.agents/skills/bullmq-specialist/SKILL.md` |
| `docker-deployment` | Docker multi-stage builds, Docker Compose, production deployment | `.agents/skills/docker-deployment/SKILL.md` |
| `git-conventions` | Conventional commits, branch naming, PR workflow | `.agents/skills/git-conventions/SKILL.md` |
| `media-uploads` | Cloudflare R2 presigned URLs, file validation, CDN delivery | `.agents/skills/media-uploads/SKILL.md` |
| `migrations` | TypeORM migration patterns, safety checks, rollback strategies | `.agents/skills/migrations/SKILL.md` |
| `nestjs-best-practices` | NestJS best practices and architecture patterns for building production-ready applications | `.agents/skills/nestjs-best-practices/SKILL.md` |
| `observability` | Pino logging, health checks, Prometheus metrics, monitoring | `.agents/skills/observability/SKILL.md` |
| `payments` | Stripe/Razorpay integration, webhook idempotency, refund flows | `.agents/skills/payments/SKILL.md` |
| `redis-caching` | Redis connection config, caching strategies, BullMQ queue setup, rate limiting | `.agents/skills/redis-caching/SKILL.md` |
| `testing` | Jest unit tests, Supertest E2E, mocking external services | `.agents/skills/testing/SKILL.md` |
| `typeorm` | Guidelines for developing with TypeORM | `.agents/skills/typeorm/SKILL.md` |

Skills are loaded on-demand via the `skill` tool when an agent needs domain-specific guidance.
