## Agents for Offbeat Pravasi Backend

Purpose: Formalize the set of contributor/automation agents used for code changes, automation, and reviews. This file follows the OpenCode agents guidance: https://opencode.ai/docs/agents/ and maps each agent to areas described in the project's NestJS blueprint.

---

# Repository Intelligence Workflow

Before answering any coding question or modifying code, always follow this escalation order (it is the single source of truth for minimizing context usage):

1. **Build or update the repository graph** (code-review-graph).
2. **Query the repository graph** for affected files.
3. **Use AST search** (ast-grep) to locate symbols, decorators, providers, repositories, DTOs, entities, queues, and services.
4. **Use the TypeScript Language Server** for: Go to Definition, Find References, Rename Symbol, Call Hierarchy.
5. **Use ripgrep** only for simple text searches, or as a fallback if graph/AST tools are unavailable.
6. **Read only the files required for the task.**
7. **Never scan the entire repository** unless explicitly requested.

---

# Backend Engineering Standards

### TypeScript & NestJS
- Use strict TypeScript; never introduce `any`.
- Keep controllers thin; place business logic in services.
- Keep processors lightweight.
- Preserve module boundaries; avoid circular dependencies.
- Use dependency injection correctly.
- Optimize SQL queries; avoid N+1 queries.
- Recommend indexes when appropriate.
- Write idempotent BullMQ jobs.
- Use DTOs for all API contracts.
- Use transactions where necessary.
- Preserve existing architecture.

### Database schema changes
- Never enable `synchronize: true` outside local development.
- All schema changes go through TypeORM migrations — generate, review, and commit migration files; never rely on auto-sync in staging or production.
- Call out migration reversibility and any data-backfill implications when proposing schema changes.

### Code style and linting
- Do not invent new style rules. Use the repository's existing ESLint and Prettier config as the definition of "consistent coding style."
- If no lint/format config exists, flag this rather than silently picking a style.
- Run lint/format checks on changed files before considering a change complete.

### Secrets and environment configuration
- Never hardcode credentials, connection strings, API keys, or tokens in source, migrations, or docs.
- Use existing environment variable / config module patterns already present in the repo.
- Never print, log, or commit `.env` file contents. Treat `.env*` files as read-only reference for variable *names*, not values.

### Git conventions
- Do not commit or push automatically. Prepare changes and let the user review and commit, unless explicitly asked to commit.
- Follow the repository's existing commit message convention (e.g., Conventional Commits).
- Do not create or switch branches without confirmation.

---

# Code Review Workflow

Before editing code:
1. Understand the architecture.
2. Identify affected modules.
3. Identify callers and callees.
4. Analyze database impact (including whether a migration is required).
5. Analyze queue impact.
6. Analyze API impact.
7. Recommend the smallest safe change.

Never rewrite working code without a clear architectural reason.

---

# Agent Definitions

Agent Template (follow for each agent)
- Name: short `kebab-case` agent id (e.g., `bookings-payments-agent`)
- Role: one-line summary of responsibilities
- When to use: triggers or change types that should pick this agent
- Inputs: artifacts the agent expects (files, DTOs, infra, env vars)
- Outputs / Actions: expected outputs (PRs, migrations, infra changes, docs)
- Scope / Permissions: where the agent may make changes and what it must not touch
- Example PR title: recommended PR title pattern

Agents

- Name: `auth-agent`
	- Role: Authentication flows (email OTP, JWT access/refresh, Google OAuth), session management, admin whitelist logic.
	- When to use: changes to `src/modules/auth`, DTOs, `user_sessions`, OTP Redis keys, or security config.
	- Inputs: DTOs, `users` entity, env (JWT secrets, OTP TTLs).
	- Outputs: controller/service changes, migrations, docs, unit tests.
	- Scope: application auth code only; do not alter unrelated modules.
	- Example PR title: `feat(auth): add refresh token rotation`

- Name: `users-agent`
	- Role: User profile, onboarding, device tokens, search APIs and user-related indexes.
	- When to use: changes to `src/modules/users`, onboarding DTOs, or user search endpoints.
	- Inputs: `users` entity, onboarding DTOs, migrations.
	- Outputs: API changes, migrations, tests.
	- Example PR title: `fix(users): enforce unique username constraint`

- Name: `treks-agent`
	- Role: Trek CRUD, filters, geospatial queries, indexes, and related migrations.
	- When to use: schema changes in `treks` entity, index additions, or search improvements.
	- Inputs: entity, migrations, indexes.
	- Outputs: migration files, query optimizations, tests.
	- Example PR title: `feat(treks): add full-text index on name and location`

- Name: `posts-stories-agent` (**DEPRECATED** — Posts and Stories modules retired)
	- Role: Posts, comments, likes, story expiry, media metadata and thumbnail jobs.
	- When to use: `posts`/`stories` entities, media metadata handling, story expiry jobs.
	- Inputs: posts/stories DTOs, media keys, worker processors.
	- Outputs: API changes, worker processors, cron jobs, tests.
	- Example PR title: `feat(stories): expire stories via bullmq job`
	- Status: Retained for archival reference only. The Posts and Stories modules have been removed from the active module registry. Do not use for new work.

- Name: `bookings-payments-agent`
	- Role: Booking lifecycle, payment provider integration (Stripe/Razorpay), webhooks, ticket PDF generation.
	- When to use: booking entity changes, payments entity/workflows, webhook handlers, PDF generation code.
	- Inputs: bookings/payments entities, provider keys (env), webhook tests.
	- Outputs: controllers, services, webhook validators, integration tests, migration.
	- Example PR title: `feat(bookings-payments): add razorpay webhook handler`

- Name: `media-agent`
	- Role: Presigned upload endpoints, Cloudflare R2 integrations, validation, and CDN URL patterns.
	- When to use: `media` module changes, presign routes, and R2 credential handling.
	- Inputs: env (R2 keys), media module code, bucket conventions.
	- Outputs: presign endpoints, helpers, tests.
	- Example PR title: `feat(media): presigned upload for profiles`

- Name: `notifications-agent`
	- Role: Device token lifecycle, push notification templates, queueing and fan-out logic.
	- When to use: device token registration, push payload changes, notification workers.
	- Inputs: FCM service keys, device token model, worker processors.
	- Outputs: queue processors, templates, retries/backoff policies.
	- Example PR title: `fix(notifications): stable retry on push failures`

- Name: `jobs-workers-agent`
	- Role: Background jobs, BullMQ queues, schedulers, processors, and monitoring hooks.
	- When to use: any change under `jobs/`, worker processors, or schedule changes.
	- Inputs: queue config, Redis settings, processor code.
	- Outputs: processor code, unit and integration tests, monitoring metrics.
	- Example PR title: `chore(jobs): consolidate booking reminder job`

- Name: `organizer-admin-agent`
	- Role: Organizer application flow, organizer dashboard endpoints, admin review and moderation tools.
	- When to use: changes to organizer/admin modules, permission guards, dashboards.
	- Inputs: organizer DTOs, admin guards, metrics queries.
	- Outputs: API changes, RBAC guards, docs.
	- Example PR title: `feat(admin): organizer approval endpoint`

- Name: `observability-agent`
	- Role: Logging (Pino), metrics (Prometheus), OpenTelemetry configuration, and health endpoints.
	- When to use: instrumentation, liveness/readiness, or logging format changes.
	- Inputs: logging config, telemetry env, health module.
	- Outputs: instrumentation, dashboards, readiness probes.
	- Example PR title: `chore(obs): add request duration histogram`

How to adopt this spec
- Use the Agent Template above when adding a new agent entry.
- When filing a PR, prefix the title with the agent's short id where appropriate.
- Link to `nest_backend_blueprint.md` for design and DTO/entity expectations.

Agent Skills (.agents/)
- Purpose: centralize reusable skill definitions, runbooks, and agent-specific prompts under the `.agents/` directory so agents can follow consistent patterns and avoid duplicating guidance.
- Rule: Agents SHOULD consult and reuse skill files in `.agents/` when performing tasks (e.g., code mod rules, testing recipes, runbooks).
- What to store in `.agents/`:
	- human-readable runbooks and task steps for common workflows (migrations, webhooks, payment flows)
	- skill prompts and instruction fragments for automated agents
	- small helper scripts or templates used by agents (formatters, codegen templates)
- Conventions: name subfolders by domain (e.g., `.agents/auth/`, `.agents/bookings/`) and include a `README.md` describing inputs, outputs, and expectations.
- Example: `.agents/bookings/README.md` documents webhook verification steps, idempotency keys, and test cases for `bookings-payments-agent`.

Security & Permissions
- Agents are a documentation convention: actual code changes must follow repository ownership and review rules. Do not commit secrets; reference env variables instead.

Maintainers & Contacts
- Add specific owner emails or GitHub handles here when known. For now, primary areas of ownership live with the teams editing `jobs/`, `src/modules/bookings`, and `src/modules/payments`.

Created: updated to follow OpenCode agents guidance — review and iterate.
