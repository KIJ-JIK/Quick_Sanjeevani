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

---

## 7. Orders & Payments
### `POST /api/orders`
Creates a new medicine order (from Mobile App, WhatsApp bot, or Web).
- **Request Body**:
```json
{
  "customerPhone": "+919876543210",
  "customerName": "Smt. Shanta Devi",
  "items": [
    { "medicineName": "Dolo 650", "quantity": 2, "unitPrice": 30.5 },
    { "medicineName": "Pantocid 40mg", "quantity": 1, "unitPrice": 15.5 }
  ],
  "deliveryAddress": {
    "street": "4th Cross, Judicial Layout, Yelahanka",
    "city": "Bengaluru",
    "pincode": "560064"
  },
  "source": "whatsapp"
}
```
- **Response `201 Created`**:
```json
{
  "status": "success",
  "order": {
    "orderNumber": "QS-892104-102",
    "totalAmount": 76.5,
    "pharmacyName": "City Chemist & Druggist (Yelahanka)",
    "fulfillmentStatus": "placed"
  },
  "payment": {
    "paymentLinkId": "plink_8x291",
    "paymentUrl": "https://rzp.io/l/qs_892104-102"
  }
}
```

### `GET /api/orders?phone={phone}&status={status}`
Lists active and past customer orders.

### `POST /api/orders/:id/pay`
Confirms payment completion via Razorpay webhook or callback.

### `PATCH /api/orders/:id/status`
Updates order fulfillment status (`placed` -> `verified_by_pharmacist` -> `packing` -> `out_for_delivery` -> `delivered`).

---

## 8. Company & Pharmacy Portal Architecture
### `GET /api/company/dashboard`
Returns enterprise executive metrics (total orders, GMV, partner pharmacies, active deliveries, elder adherence rate).

### `GET /api/company/pharmacies`
Lists partner neighborhood chemist roster with live inventory count and fulfillment scores.

### `PATCH /api/company/prescriptions/:id/verify`
Pharmacist verification sign-off workflow. Allows licensed pharmacist to review extracted prescription scan, approve or adjust medications, and add dispensing notes.

### `POST /api/company/inventory/sync`
Batch synchronization endpoint for pharmacy POS software updating stock levels.

### `GET /api/company/orders/queue`
Real-time dispatch and packing queue for participating neighborhood chemists.
