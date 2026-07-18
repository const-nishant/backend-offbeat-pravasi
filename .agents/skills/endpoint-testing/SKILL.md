---
name: endpoint-testing
description: Manual/automated live endpoint testing workflow for this project's admin & public APIs — auth, edge cases, PowerShell runner patterns, and the test tracker. Use when verifying HTTP endpoints against dev/staging.
---

# Endpoint Testing (live API)

Workflow for testing NestJS endpoints on the running dev/staging server.

## Prerequisites
- Base URL + `GLOBAL_API_KEY` come from `.env` / Postman env (`postman/Offbeat-Pravasi-API.postman_environment.json`).
- Most admin routes require **two** headers:
  - `x-api-key: <GLOBAL_API_KEY>`
  - `Authorization: Bearer <JWT accessToken>`
- Admin role guard: `AuthGuard('jwt')` + `AdminRolesGuard`. Roles are on the method via `@AdminRoles(...)`. Check the controller for which roles are allowed (e.g. `SUPERADMIN`, `ANALYST`).

## Login to get a token
```powershell
$base = "https://offbeat-dev-api.const-nishant.in/api/v1"
$apiKey = "091d8edf7b5652b4c65ec6940115b8c197b8f99919e86e27e11022fd4cd2477f"
$cred = @{email="offbeatparvasi@gmail.com";password="offbeat-pravasi2026"} | ConvertTo-Json
$tok = (Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $cred).data.accessToken
$h = @{"Content-Type"="application/json"; "x-api-key"=$apiKey; "Authorization"="Bearer $tok"}
```
**Token TTL is short (~15 min). Re-login per script or per loop iteration** — reusing a stale token yields `401 Unauthorized` that looks like an auth bug but is just expiry.

## PowerShell gotchas (this repo's shell is PowerShell 5.1)
- `ConvertTo-Json` flag is `-Depth <n>` (NOT `-Depth6`). Use `-Depth 6 -Compress`.
- `Invoke-WebRequest` gives reliable status codes; `Invoke-RestMethod` sometimes hides `$_.Exception.Response` in 5.1. For negative tests use:
  ```powershell
  try { $r = Invoke-WebRequest -Uri $url -Method POST -Headers $h -Body $json -UseBasicParsing; "OK $($r.StatusCode)" }
  catch { if ($_.Exception.Response) { "ERR $($_.Exception.Response.StatusCode.value__)" } else { "NO_RESP $($_.Exception.Message)" } }
  ```
- Do NOT pipe a `try/catch` block directly into `Set-Content`/`Out-File` — assign to a variable first.
- Build JSON strings with `@{...} | ConvertTo-Json -Compress` *outside* loops (inline `-Depth6` is misparsed as a flag).

## Edge-case checklist (per endpoint)
1. **Auth:** no header → 401; garbage token → 401; missing `x-api-key` → 401; wrong role → 403.
2. **Validation:** each required field missing → 400; wrong type → 400; `@ArrayMinSize` → 400 on empty; `@Min/@Max` range; `@IsDateString`; custom class-validator constraints (e.g. sum-to-100, endDate>=startDate).
3. **Business:** duplicate unique key → 409 (not 500); non-existent id → 404; invalid FK/enum → 400; action on already-concluded/deleted resource.
4. **Happy path:** valid body → 2xx and correct shape.

## Verify after a fix deploy
- Commits deploy separately; the live server keeps old behavior until redeployed. Re-run the same cases post-deploy to confirm.
- Confirm the *new* code is live by checking a previously-broken case now returns the expected status.

## Test tracker
- Keep `ab-tests-test-tracker.md` (repo root) updated: one table per group of endpoints, rows per case with Expected / Actual / Status.
- Mark untestable cases (e.g. ANALYST-role checks needing a separate token) explicitly rather than skipping silently.

## Notes
- Prefer reading the controller + service + DTO to learn exact validation before testing. Look for `@AdminRoles`, class-validator decorators, and unique `@Index` on entities.
- Data-quality oddities (e.g. null `actorId` in activity logs) are observations, not endpoint bugs — record them separately.
