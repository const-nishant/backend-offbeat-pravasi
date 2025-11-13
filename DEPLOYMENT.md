# Deployment Guide — Offbeat Pravasi Backend

This document explains how to deploy the backend using **Docker**, **Docker Compose**, and optional **CI/CD pipelines**.

---

# 🐳 Docker Setup

## 1. Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist

CMD ["node", "dist/main.js"]
```

---

# 🐳 docker-compose.yml (Local & Production)

```yaml
version: '3.9'

services:
  api:
    build: .
    container_name: offbeat-api
    restart: always
    env_file: .env
    ports:
      - '3000:3000'
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_DB: offbeat_pravasi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: always
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

---

# 🚀 Build & Run

```
docker compose build
docker compose up -d
```

---

# 🌐 Environment Variables (example)

```
PORT=3000

DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=offbeat_pravasi
TYPEORM_SYNC=false

REDIS_HOST=redis
REDIS_PORT=6379

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=30d

OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

GLOBAL_API_KEY=your_api_key_here
```

---

# 🔁 Running Migrations

```
npm run build
npm run typeorm:migration:run
```

---

# ⚡ Optional CI/CD — GitHub Actions

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build Project
        run: npm run build

      - name: Build Docker Image
        run: docker build -t offbeat-api .

      - name: Deploy to Server (SSH)
        run: |
          ssh user@server 'docker pull ... ; docker compose up -d --force-recreate'
```

---

# 🏁 Final Notes

- API logs in **JSON**, compatible with ELK/Loki
- Environment variables must be configured manually
- Redis is required for OTP, sessions, queues
- Cloudflare R2 is used for media storage (see media module)
- Always deploy with `npm run build` (not ts-node)

---

# ✔ Deployment Ready

You now have:

- Dockerfile
- Compose setup
- CI/CD example
- Environment variable structure
- Migration flow
- Production instructions
