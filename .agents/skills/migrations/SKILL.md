---
name: migrations
description: TypeORM migration patterns for schema changes, including generation, review, safety checks, and rollback
---

# Migrations

TypeORM migration patterns for this project.

## Golden Rules
- **Never** use `synchronize: true` outside local development
- All schema changes go through TypeORM migrations
- Migration files are committed to version control
- Every migration must have a `down()` method

## Workflow
```bash
# Generate migration from entity changes
npx typeorm migration:generate src/migrations/AddUserAge -d src/data-source.ts

# Review the generated SQL before running
# Run migrations
npx typeorm migration:run -d src/data-source.ts

# Revert if needed
npx typeorm migration:revert -d src/data-source.ts
```

## Safety Checklist
- Does the migration handle existing data? (defaults, backfill, nullable)
- Is the down migration reversible without data loss?
- Are there foreign key constraints that might block the change?
- Will this cause downtime? (e.g., long-running ALTER TABLE on large tables)
- Is there a composite index being added? (check performance impact)

## Common Patterns
- **Add column with default:** Add as nullable first, backfill, then set NOT NULL
- **Rename column:** Add new column → copy data → drop old (2-step migration)
- **Add index concurrently:** Use `CONCURRENTLY` in production to avoid table locks
- **Remove column:** Deploy code that doesn't use it, then drop in next migration
