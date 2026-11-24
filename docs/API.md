# 📡 Quick Sanjeevani API Reference

## Base URL
- Development: `http://localhost:5000/api`
- WhatsApp Webhook: `http://localhost:3001/webhook`

---

## 1. System Health
### `GET /health`
Returns current process uptime, service status, and database connection state.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "uptime": 1420,
  "database": "connected",
  "timestamp": "2026-11-24T18:00:00.000Z"
}
```

---

## 2. Authentication
### `POST /api/auth/send-otp`
Requests mock OTP for a 10-digit Indian phone number.
- **Request Body**:
```json
{ "phone": "9876543210" }
```
- **Response `200 OK`**:
```json
{ "success": true, "message": "OTP sent successfully" }
```

### `POST /api/auth/verify-otp`
Verifies OTP and returns JWT Bearer token.
- **Request Body**:
```json
{ "phone": "9876543210", "otp": "123456" }
```
- **Response `200 OK`**:
```json
{ "token": "eyJhbGciOi...", "user": { "id": "...", "name": "...", "phone": "9876543210" } }
```

---

## 3. Medicines
### `GET /api/medicines?q={search}&category={cat}&page=1&limit=20`
Searches medicine catalogue by brand name, generic salt, or category. Supports fuzzy matching.

---

## 4. Pharmacies
### `GET /api/pharmacies/nearby?lat={latitude}&lng={longitude}&radius={km}`
Discovers participating neighbourhood pharmacies with confirmed stock status.

---

## 5. Offline Sync
### `POST /api/sync`
Implements the WatermelonDB pull/push sync protocol.
- **Query / Body**:
```json
{
  "lastPulledAt": 1732450000000,
  "changes": {
    "reminders": { "created": [...], "updated": [], "deleted": [] }
  }
}
```

---

## 6. WhatsApp Bot Webhook
### `POST /webhook` (Port 3001)
Receives inbound Twilio webhook payloads (text, images, audio).
- Always returns `<Response></Response>` within 50ms with HTTP 200 to satisfy Twilio SLA.
- Asynchronously processes user query, invokes intent engine, generates ElevenLabs TTS, and sends outbound message.
