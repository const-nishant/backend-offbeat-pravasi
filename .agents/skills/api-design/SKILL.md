---
name: api-design
description: RESTful API design conventions for NestJS including DTOs, class-validator, serialization, and versioning
---

# API Design

RESTful API conventions used in this project.

## DTOs
- One DTO per operation: `CreateXDto`, `UpdateXDto`, `XQueryDto`, `XResponseDto`
- Use `class-validator` decorators for validation on request DTOs
- Use `class-transformer` (`@Expose`, `@Exclude`, `@Type`, `@Transform`) for response serialization
- Enable `whitelist: true` globally to strip unknown properties

## Validation
- Global `ValidationPipe` with `transform: true` and `forbidNonWhitelisted: true`
- Parse UUID params with `ParseUUIDPipe`
- Use `DefaultValuePipe` for optional query params with defaults

## Response Format
- Consistent JSON envelope via interceptors: `{ data, meta }`
- Pagination: `{ items, meta: { page, limit, total, totalPages } }`
- Error responses follow NestJS format: `{ statusCode, message, error }`

## Naming
- Routes: plural nouns, kebab-case (`/users/:id/bookings`)
- Query params: camelCase (`pageSize`, `sortBy`)
- JSON fields: camelCase (transformed via class-transformer)
