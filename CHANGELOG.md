# Changelog

All notable changes to this project will be documented in this file.

This project follows a structured release flow and keeps the backend clean, type-safe, and scalable.

---

## [Unreleased]

### Added

- Core project scaffolding using NestJS
- Complete folder/module structure (DDD-style)
- Global JSON LoggingInterceptor
- TransformInterceptor for unified success responses
- AllExceptionsFilter for error formatting
- ValidationExceptionFilter for DTO validation errors
- API Key Guard, Admin Guard, Organizer Guard
- CurrentUser decorator + Express request typing
- Redis unified configuration (redis.config.ts)
- ORM configuration (ormconfig.ts)
- Unified Redis client using `ioredis`
- BullMQ queues & baseline workers
- Cleanup processor (expired OTPs, refresh tokens, stories)
- Auth module:
  - Register, Login, Refresh
  - OTP send + verify
  - Access + Refresh JWT strategies
  - Refresh token rotation via Redis
  - AuthController + DTOs
- User entity (complete with profile fields + organizer status)
- Pagination DTO + pagination utilities
- Health module (server + Redis health)
- JSON-based project-wide logging
- Code-style conventions and backend rules
- Centralized Swagger configuration (`src/config/swagger.config.ts`), UI at `/docs`, and `npm run swagger:export` script that writes `docs/swagger.json`

### Changed

- Standardized all modules to strict typing (no `any`)
- Centralized Redis usage across queues and services
- All environment variables accessed via `process.env.*`

### Removed

- ConfigModule and validation schemas (project rule)
- Unstructured success responses (now uses interceptor)

---

## [0.1.0] – Initial Backend Bootstrapping

- Project initialized with NestJS
- Environment-based configuration setup
- Basic modules created
