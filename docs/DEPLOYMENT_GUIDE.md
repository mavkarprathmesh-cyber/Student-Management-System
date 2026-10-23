# Production Deployment Guide: Student Management System (SMS)

This document provides complete instructions for deploying the **Student Management System** to production environments with a persistent managed PostgreSQL database, secure HTTPS, environment configuration, and automated build pipelines.

---

## 1. Production Architecture Overview

- **Frontend:** Static Single-Page Application (SPA) built with Vite and React, deployable to Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront, or served as static files by an Nginx reverse proxy.
- **Backend:** Node.js Express API service run using Node.js / PM2 / Docker container on Railway, Render, Fly.io, DigitalOcean App Platform, or AWS ECS/EC2.
- **Database:** Managed PostgreSQL instance (e.g. Supabase, Neon, AWS RDS, Railway PostgreSQL, or DigitalOcean Managed PostgreSQL).

---

## 2. PostgreSQL Database Setup with Prisma

In local development, the application is pre-configured with SQLite for zero-friction setup. For production, switch to PostgreSQL:

### Step 1: Copy PostgreSQL Schema
Copy `server/prisma/schema.postgresql.prisma` to `server/prisma/schema.prisma` or run:
```bash
npm --prefix server run db:use-postgres
```

Or edit `server/prisma/schema.prisma` datasource block:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Set the Production `DATABASE_URL`
In your production environment variables (e.g., in Railway, Render, or Supabase):
```env
DATABASE_URL="postgresql://user:password@host:5432/sms_production_db?schema=public&sslmode=require"
```

### Step 3: Run Database Migrations
Run the Prisma migration deploy command during the build or pre-start step:
```bash
cd server
npx prisma migrate deploy
# or push schema directly:
npx prisma db push
```

---

## 3. Environment Variables

### Backend (`server/.env` in production):
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://<user>:<password>@<db-host>:5432/sms_db?schema=public&sslmode=require"
JWT_ACCESS_SECRET="<generate-random-64-character-hex-string>"
JWT_REFRESH_SECRET="<generate-random-64-character-hex-string>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLIENT_URL="https://sms.yourinstitution.edu"
UPLOAD_DIR="./uploads"
```

### Frontend (`client/.env.production`):
```env
VITE_API_URL="https://api.sms.yourinstitution.edu"
```

---

## 4. Initial Administrator Initialization in Production

In a freshly deployed production database, public administrator registration is disabled. You can securely initialize the first administrator in one of two ways:

### Option A: Via Secure One-Time API Call
The backend includes a locked initial setup endpoint: `POST /api/auth/init-admin`. It only succeeds once when zero administrators exist in the database:
```bash
curl -X POST https://api.sms.yourinstitution.edu/api/auth/init-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourinstitution.edu", "password": "<StrongPassword123>"}'
```

### Option B: Via Production Seed Script
```bash
cd server
npm run prisma:seed
```

---

## 5. Deployment Options

### Option A: Railway / Render (Full-Stack Unified)
1. Link your GitHub repository.
2. Add a PostgreSQL database service in Railway.
3. Configure Backend service:
   - Root directory: `server`
   - Build command: `npm install && npx prisma db push && npm run build`
   - Start command: `npm run start`
   - Environment variables: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`
4. Configure Frontend service:
   - Root directory: `client`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`

### Option B: Docker Container Deployment
Use a multi-stage Docker build:
```dockerfile
# Dockerfile for Backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 5000
CMD ["npm", "run", "start"]
```

---

## 6. Health Checks & Monitoring

The backend exposes a health check endpoint for container orchestrators and load balancers:
```http
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "uptime": 128.45,
  "timestamp": "2026-10-21T18:00:00.000Z",
  "environment": "production"
}
```
