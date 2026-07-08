---
name: docker-deployment
description: Docker configuration, multi-stage builds, Docker Compose for dev/prod, and deployment patterns
---

# Docker & Deployment

Docker and deployment patterns for this project.

## Docker Setup
- **Dev:** `docker-compose-dev.yml` with hot-reload via `nest start --watch`
- **Prod:** `docker-compose-prod.yml` with multi-stage build
- Node.js 22.22.1+ base image (matches `.nvmrc`/`engines`)

## Best Practices
- Multi-stage builds: `build` stage → `production` stage (only `dist/` + `node_modules --production`)
- Never run as root — use `USER node`
- Set `NODE_ENV=production` in prod containers
- Use health checks: `HEALTHCHECK --interval=30s CMD node dist/health.js`

## Docker Compose Services
- `api` — NestJS application
- `postgres` — Primary database
- `redis` — BullMQ queues + caching
- Build images with `--build-arg` for env-specific config

## Deployment
- Run migrations as init container before deploying new app version
- Use graceful shutdown (SIGTERM → drain BullMQ → close DB connections)
