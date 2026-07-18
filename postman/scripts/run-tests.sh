#!/usr/bin/env bash
# Run the Offbeat Pravasi Postman collection with Newman.
# Usage: ./run-tests.sh <env>   (env: local|staging|production, default staging)
set -euo pipefail
ENV="${1:-staging}"
COLLECTION="$(dirname "$0")/../collections/offbeat-pravasi-api.postman_collection.json"
ENV_FILE="$(dirname "$0")/../environments/${ENV}.postman_environment.json"

if ! command -v newman >/dev/null 2>&1; then
  echo "newman not found - install with: npm install -g newman newman-reporter-htmlextra"
  exit 1
fi

newman run "$COLLECTION" -e "$ENV_FILE" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export "$(dirname "$0")/../reports/${ENV}-report.html" \
  --timeout-request 15000
