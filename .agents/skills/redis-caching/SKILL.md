---
name: redis-caching
description: Redis patterns for caching, BullMQ queues, session management, and rate limiting in NestJS
---

# Redis & Caching

Redis usage patterns in this project.

## Connection
- Single `ioredis` instance shared across BullMQ queues, caching, and sessions
- Required config: `maxRetriesPerRequest: null`, `enableReadyCheck: false` for BullMQ
- Connection via `REDIS_URL` env var

## Caching Strategies
- Short TTL (60s) for frequently updated data (user profiles, trek availability)
- Medium TTL (5min) for reference data (categories, gear lists)
- Long TTL (30min+) for static data (policy documents, terms)
- Cache invalidation via event-driven pattern: emit event on data mutation

## BullMQ Integration
- All job queues share the same Redis connection
- Configure `defaultJobOptions` globally: `attempts: 3`, exponential backoff
- Queue names in this project: `email`, `notifications`, `bookings`, `media`, `stories`, `weather`

## Session Storage
- OTP codes stored in Redis with TTL (use `SET key value EX ttl`)
- Rate limit counters stored in Redis with TTL window
- Refresh token blacklist for immediate invalidation
