# 🛠️ Quick Sanjeevani Setup & Deployment Guide

## Local Development Setup

### 1. Environment Configuration
Copy `.env.example` to `.env` in the root and in the respective packages (`server/.env`, `whatsapp-bot/.env`):
```bash
cp .env.example .env
cp .env.example server/.env
cp .env.example whatsapp-bot/.env
```

### 2. Database Seeding
To seed MongoDB or the in-memory mock store with 62 verified medicines and 5 pharmacies:
```bash
cd server
node src/seeds/seed.js
```
Validate seed integrity:
```bash
node src/seeds/seed.js --validate
```

### 3. Running with PM2 (Supervised Mode)
To run backend services under PM2 process supervision:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
```

### 4. Running the Tests
Run the standalone integration and resilience test suite:
```bash
node tests/e2e-runner.js
```
