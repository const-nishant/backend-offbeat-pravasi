---
name: Postman API Testing
description: API testing skill using Postman and Newman, covering collections, environments, pre-request scripts, test scripts, and CI/CD integration with Newman. Use when the user asks to create, review, or debug Postman collections and test scripts, or generate a production-ready Postman collection from this backend.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [postman, newman, api-testing, rest, collections, ci-cd]
testingTypes: [api]
frameworks: [postman]
languages: [javascript]
domains: [api]
agents: [opencode, claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Postman API Testing Skill

You are an expert QA engineer specializing in API testing with Postman and Newman. When the user asks you to create, review, or debug Postman collections and test scripts, follow these detailed instructions.

## Core Principles

1. **Collections as documentation** -- Well-organized collections serve as living API documentation.
2. **Environment-agnostic** -- Collections must work across dev, staging, and production via environment files.
3. **Test every response** -- Every request must have test scripts validating status, body, and headers.
4. **Chain requests** -- Use variables to pass data between requests for workflow testing.
5. **CI-ready** -- Collections must run via Newman in CI/CD pipelines.

## Project Structure

```
postman/
  collections/
    <module>-api.postman_collection.json
  environments/
    local.postman_environment.json
    staging.postman_environment.json
    production.postman_environment.json
  scripts/
    run-tests.sh
```

## Environment Variables (NEVER hardcode)

```json
{
  "name": "Production",
  "values": [
    { "key": "baseUrl", "value": "https://api.offbeatpravasi.com", "enabled": true },
    { "key": "apiVersion", "value": "v1", "enabled": true },
    { "key": "accessToken", "value": "", "enabled": true },
    { "key": "refreshToken", "value": "", "enabled": true },
    { "key": "adminAccessToken", "value": "", "enabled": true }
  ]
}
```

## Pre-Request Scripts

### Auth token auto-refresh (collection-level)
```javascript
const tokenExpiry = pm.environment.get("tokenExpiry");
const now = Date.now();
if (!tokenExpiry || now > parseInt(tokenExpiry)) {
    const loginRequest = {
        url: `${pm.environment.get("baseUrl")}/auth/login`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                email: pm.environment.get("adminEmail"),
                password: pm.environment.get("adminPassword"),
            }),
        },
    };
    pm.sendRequest(loginRequest, (error, response) => {
        if (error) { console.error("Login failed:", error); return; }
        const json = response.json();
        pm.environment.set("accessToken", json.accessToken || json.token);
        pm.environment.set("tokenExpiry", String(Date.now() + 55 * 60 * 1000));
    });
}
```

### Dynamic test data
```javascript
pm.variables.set("uniqueEmail", `test-${Date.now()}@example.com`);
pm.variables.set("uniqueName", `TestUser_${Date.now()}`);
```

## Test Scripts

### Status + body + schema (attach to EVERY request)
```javascript
pm.test("Status is success", () => {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});
const jsonData = pm.response.json();
pm.test("Response has expected shape", () => {
    pm.expect(jsonData).to.have.property("success");
});
pm.test("Response time < 2000ms", () => {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

### Variable chaining
```javascript
// After create:
pm.environment.set("resourceId", pm.response.json().data.id);
// Next request uses {{resourceId}}
```

## Collection JSON skeleton (v2.1.0)

```json
{
  "info": {
    "name": "Offbeat Pravasi API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "url": { "raw": "{{baseUrl}}/auth/login", "host": ["{{baseUrl}}"], "path": ["auth", "login"] },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{adminEmail}}\",\n  \"password\": \"{{adminPassword}}\"\n}",
              "options": { "raw": { "language": "json" } }
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));",
                  "const j = pm.response.json();",
                  "pm.test('Has accessToken', () => pm.expect(j.accessToken || j.token).to.exist);",
                  "pm.environment.set('accessToken', j.accessToken || j.token);"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Newman CLI

```bash
newman run postman/collections/auth-api.postman_collection.json -e postman/environments/production.postman_environment.json
newman run postman/collections/auth-api.postman_collection.json -e postman/environments/production.postman_environment.json -r cli,htmlextra
```

## CI/CD (GitHub Actions)

```yaml
name: API Tests
on: [push, pull_request]
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g newman newman-reporter-htmlextra
      - run: newman run postman/collections/*.postman_collection.json -e postman/environments/staging.postman_environment.json -r cli,htmlextra
```

## Best Practices
1. Use `{{baseUrl}}` / `{{accessToken}}` — never hardcode.
2. Every request gets at least status + body assertions.
3. Chain requests via `pm.environment.set()`.
4. Folder per module; descriptive request names.
5. Auto-refresh tokens in pre-request scripts.
6. Version collections in source control.

## Anti-Patterns
1. Hardcoded URLs / credentials.
2. Requests without test scripts.
3. No 400/401/404 error-case coverage.
4. Missing `Content-Type: application/json` on POST/PUT/PATCH.
5. Empty request bodies on POST endpoints.
