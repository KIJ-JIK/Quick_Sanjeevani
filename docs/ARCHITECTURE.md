# 🏗️ Quick Sanjeevani System Architecture

## Architectural Principles
Quick Sanjeevani is architected as an offline-first modular monorepo structured around four non-negotiable principles:
1. **Crash Resilience First**: The system must never crash on unhandled promise rejections, simulated network cuts, or third-party API timeouts.
2. **Offline Independence**: The customer mobile application must be functional without active internet connectivity.
3. **Elderly Accessibility**: The system provides an automated WhatsApp channel with voice note interactions in regional Indian languages (Hindi & Kannada).
4. **Seamless Business Expansion**: The data models and service layers built for the customer MVP are directly reusable by a future pharmacy partner and admin portal without architectural rewrites.

---

## 4-Layer Crash Resilience Model

```
+--------------------------------------------------------------------+
| Layer 1: Process-Level Supervision (PM2 & Node Runtime Guards)     |
| - PM2 restart policies with exponential backoff & 500MB memory cap |
| - Global uncaughtException and unhandledRejection catchers         |
| - Graceful SIGTERM/SIGINT shutdown with connection drain           |
+--------------------------------------------------------------------+
                                 |
+--------------------------------------------------------------------+
| Layer 2: API Gateway & Middleware Safety                          |
| - Async route wrappers (asyncHandler) ensuring zero unhandled prom.|
| - RFC 7807 Problem Details structured error serialization          |
| - Helmet HTTP security headers & rate limiting                     |
+--------------------------------------------------------------------+
                                 |
+--------------------------------------------------------------------+
| Layer 3: Service-Level Circuit Breakers                            |
| - Circuit breaker protection for external APIs (OCR, TTS, WhatsApp)|
| - Fallback to cached/seed catalog data on external timeout        |
| - Sub-50ms HTTP 200 acknowledgment for incoming webhooks           |
+--------------------------------------------------------------------+
                                 |
+--------------------------------------------------------------------+
| Layer 4: Storage & Data Engine Resilience                          |
| - Mongoose connection pooling (maxPoolSize: 10)                    |
| - Automatic reconnection listeners with backoff                   |
| - In-memory failover mock harness for zero-dependency test runs   |
+--------------------------------------------------------------------+
```

---

## Monotonic Delta Synchronization Protocol
The `/api/sync` endpoint enables offline-first operation based on WatermelonDB pull/push semantics:
- **Client Pull (`lastPulledAt`)**: Returns all records created, updated, or soft-deleted since the timestamp.
- **Client Push (`changes`)**: Submits locally queued mutations.
- **Server Conflict Resolution**: Last-Write-Wins (LWW) timestamp comparison with audit logging.
