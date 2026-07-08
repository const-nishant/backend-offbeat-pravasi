---
name: observability
description: Logging (Pino), health checks, metrics, OpenTelemetry, and monitoring patterns for NestJS
---

# Observability

Observability patterns for this project.

## Logging
- **Pino** for structured JSON logging in production
- Use `pino-pretty` for local development
- Log levels: `error` always, `warn` for recoverable issues, `info` for business events, `debug` for development
- Never log secrets, tokens, or PII
- Include `requestId` and `userId` context in every log line

## Health Checks
- `GET /health/live` — liveness probe (memory check only)
- `GET /health/ready` — readiness probe (DB ping, Redis ping)
- Use `@nestjs/terminus` health indicators

## Monitoring
- Track BullMQ queue metrics (waiting, active, failed counts)
- Monitor DB connection pool utilization
- Track HTTP request duration and status code distribution
- Set up Prometheus metrics endpoint for production

## Alerting
- Failed job rate > 5% in 5min window
- DB connection pool exhaustion (>80% utilized)
- API error rate > 1% in 5min window
- Health check failures in production
