---
name: auth-security
description: Authentication and authorization patterns for NestJS applications including JWT, OAuth, OTP, guards, and session management
---

# Auth & Security

NestJS authentication and authorization patterns used in this project.

## Authentication Strategies

### JWT Access/Refresh Token Flow
- Short-lived access tokens (15 min), long-lived refresh tokens (7 days)
- Store refresh tokens hashed in DB; invalidate on password change
- Access tokens contain minimal payload: `sub`, `email`, `roles`

### Email OTP
- OTP stored in Redis with TTL (configurable via env)
- Rate-limit OTP requests per email (3/hr)
- Verify OTP before issuing tokens

### Google OAuth
- State param prevents CSRF on OAuth callback
- Link OAuth accounts to existing email-matching user or create new

## Authorization Guards
- `JwtAuthGuard` — global default, skip with `@Public()`
- `RolesGuard` — `@Roles(Role.Admin)` decorator, reads from JWT payload
- Throttle auth endpoints aggressively (5/min for login, 3/hr for OTP)

## Security Rules
- Never log tokens, passwords, or OTPs
- Use `class-validator` with whitelist on all DTOs
- `helmet` middleware for security headers
- Rate limiting on all public endpoints
