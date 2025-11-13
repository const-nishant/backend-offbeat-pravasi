# Contributing to Offbeat Pravasi Backend

Thank you for considering contributing!  
This backend follows strict architectural rules to maintain long-term scalability and developer clarity.

---

# 🧩 Project Rules / Standards

## ✔ 1. No `any` Allowed

Every feature must be **fully typed**.  
Use `interfaces`, `types`, `DTOs`, and strict TypeScript rules.

## ✔ 2. No ConfigModule

Environment variables must be accessed directly:

```ts
process.env.MY_ENV_VAR;
```

## ✔ 3. Consistent API Response Shape

Do not manually format responses unless required.
`TransformInterceptor` wraps all success responses.

## ✔ 4. Logging in JSON

Use only JSON output for logs for compatibility with Logstash / Kibana / Loki.

---

# 🧱 Folder Structure Requirements

Each module must follow:

```
module-name/
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── dtos/
├── entities/
└── (optionally) strategies/ providers/ workers/
```

---

# 🧪 Testing Standards (Future)

- Unit tests for service logic
- Integration tests with PostgreSQL TestContainers
- Worker tests for BullMQ
- E2E tests with Supertest

---

# ⚙️ Git Commit Guidelines

Follow a clean conventional style:

```
feat: add OTP verification
fix: correct Redis cleanup logic
refactor: improve pagination util
chore: update dependencies
docs: update README
```

---

# 🚀 How to Contribute

1. Fork the repository
2. Create a feature branch:

   ```
   git checkout -b feat/my-new-feature
   ```

3. Follow project rules (strict typing, DTOs, no any)
4. Submit a clean pull request
5. Ensure meaningful commit messages
6. Write or update documentation if needed

---

# 📨 Need Help?

Create an issue or tag a maintainer in your pull request.
