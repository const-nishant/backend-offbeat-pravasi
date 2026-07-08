---
name: git-conventions
description: Git commit conventions, branch naming, and PR workflow for this project
---

# Git Conventions

Git practices for this repository.

## Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`, `build`, `style`
Scopes match module names: `auth`, `payments`, `bookings`, `media`, `notifications`, `treks`, etc.

Examples:
- `feat(auth): add refresh token rotation`
- `fix(payments): handle stripe webhook idempotency`
- `chore(deps): upgrade bullmq to 5.x`

## Branch Naming
- `feat/short-description` for features
- `fix/short-description` for bug fixes
- `chore/short-description` for maintenance

## Before Committing
1. Never commit `.env` files, secrets, or tokens
2. Run lint and type-check on changed files
3. Do not commit `node_modules/` or `dist/`
4. Review diff before staging
