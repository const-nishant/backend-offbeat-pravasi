---
name: testing
description: Testing patterns for NestJS including Jest unit tests, Supertest E2E tests, mocks, and test organization
---

# Testing

Testing conventions for this project.

## Test Stack
- **Framework:** Jest (v30)
- **E2E:** Supertest with `@nestjs/testing`
- **Coverage:** Jest coverage collection (target: `src/`)

## Unit Tests
- Use `Test.createTestingModule` with mocked providers
- Mock repositories via `useValue` with jest functions
- One `describe` block per class, one `describe` per method
- Test happy path, validation errors, and edge cases

```typescript
const module = await Test.createTestingModule({
  providers: [
    ServiceUnderTest,
    { provide: Repository, useValue: mockRepo },
  ],
}).compile();
```

## E2E Tests
- Create a `TestingModule` with `AppModule` imports
- Apply same global pipes/interceptors as production
- Use `request(app.getHttpServer())` for HTTP calls
- Clean database state between test runs

## Mocking Rules
- Mock all external services (Stripe, Razorpay, SendGrid, FCM)
- Mock TypeORM repositories, never hit real database in unit tests
- Use realistic return shapes to preserve LSP
