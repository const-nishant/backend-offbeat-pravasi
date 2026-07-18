# Offbeat Pravasi — Postman Collection

Production-ready Postman collection generated from the NestJS controllers + DTOs
(72 modules, 280 requests). Every `POST`/`PUT`/`PATCH` carries a DTO-driven sample
body; every request has status/shape test assertions; protected requests auto-attach
`Authorization: Bearer {{accessToken}}` and the collection pre-request auto-logs-in to
refresh the token.

## Files
- `collections/offbeat-pravasi-api.postman_collection.json` — the collection (v2.1.0)
- `environments/{local,staging,production}.postman_environment.json` — env vars
- `scripts/run-tests.sh` — Newman runner
- `../../scripts/generate-postman.mjs` — regenerates the collection from source

## Import
1. Postman → Import → select the collection JSON + the environment JSON.
2. Set the active environment (`Production` / `Staging` / `Local`).
3. Fill `adminEmail` / `adminPassword` in the environment (no secrets are committed).

## Environments
All requests use `{{baseUrl}}/api/v1/...` and `{{accessToken}}`. The collection-level
pre-request script logs in (via `/api/v1/auth/login`) when the token is missing or
expired, so protected requests work without manual token paste.

## Regenerate
```bash
node scripts/generate-postman.mjs
```
Re-run after adding/renaming routes or DTOs.

## CI
```bash
npm install -g newman newman-reporter-htmlextra
bash postman/scripts/run-tests.sh staging
```

## Notes
- 30 `POST`/`PATCH` action endpoints (e.g. `/admin/.../approve`, queue retry/pause,
  friend-request accept/decline, wishlist toggle) are intentionally body-less — they
  act on a path `:id` param and the API rejects stray bodies (whitelist validation).
- Sample IDs use `{{uuid}}` placeholders; replace with real IDs when chaining manually.
