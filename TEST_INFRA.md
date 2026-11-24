# Quick Sanjeevani — End-to-End Test Architecture & Infrastructure Specification
**wHACKiest 2026 Ideathon — Track 3: Know Thyself**  
**Team**: Hot Chocolate Fudge (Ansh Vasant - 20251CSE0622, MN Malathesh - 20251CSE0634)  
**Target Repository**: `https://github.com/KIJ-JIK/Quick_Sanjeevani.git`  
**Working Directory**: `C:\Users\anshv\.gemini\antigravity\scratch\quick_sanjeevani`

---

## 1. Testing Philosophy & Principles

Quick Sanjeevani implements an **opaque-box, multi-tier testing strategy** designed to validate crash-resilience, offline data integrity, and elder-friendly conversational workflows strictly across external network and IPC boundaries:
- **Zero-Dependency Standalone Runner**: Operates via native Node.js (`node tests/e2e-runner.js`) with zero external package dependencies (no Jest, Supertest, or external test runners required).
- **Dual-Mode Execution (Live vs Isolated Mock)**:
  - **Live Mode**: Executes against live running services (`http://localhost:5000` backend and `http://localhost:5001` WhatsApp bot).
  - **Isolated Mock Mode**: Automatically boots an in-memory ephemeral test harness (`tests/helpers/mock-server.js`) implementing exact interface contracts for hermetic CI, offline runs, and environments lacking MongoDB.
- **Windows Sandbox Optimization (Named Pipe IPC)**: In restricted Windows sandboxes where outbound loopback TCP connections to `127.0.0.1` encounter OS-level `EACCES`, the test harness automatically defaults to high-speed Windows Named Pipes (`\\\\.\\pipe\\qs_e2e_mock_<pid>_<timestamp>`), ensuring reliable sub-10ms request dispatch without port collisions.
- **Strict Exit Codes**: Returns exit code `0` on 100% test pass, exit code `1` on any failure.
- **Clean Console Output**: Formatted ANSI color summary table with per-tier execution timings, assertion statuses, and failure diagnostics.

---

## 2. Architecture & File Layout

```
quick_sanjeevani/
├── TEST_INFRA.md                     # This specification
├── package.json                      # Defines "test:e2e": "node tests/e2e-runner.js"
└── tests/
    ├── e2e-runner.js                 # Standalone test runner with CLI flag parsing & summary
    ├── helpers/
    │   ├── mock-server.js            # In-memory ephemeral server (Windows Named Pipe + TCP)
    │   ├── http-client.js            # Unified HTTP client supporting Named Pipe & TCP sockets
    │   └── payload-generators.js     # Twilio webhook & WatermelonDB sync payload fixtures
    └── suites/
        ├── tier1_features.test.js    # 40 happy-path tests (8 features x 5 tests min)
        ├── tier2_boundaries.test.js  # 18 boundary, injection & fault injection tests
        ├── tier3_combinations.test.js# 5 cross-feature pairwise integration flows
        └── tier4_real_world.test.js  # 3 elderly patient persona journeys
```

---

## 3. Feature Inventory Mapping Across Tiers

| Tier | Name | Target Features | Tests | Purpose |
|:---:|:---|:---|:---:|:---|
| **Tier 1** | Feature Coverage (Happy Path) | F08 Health, F09 Auth, F10 Medicines, F11 Pharmacies, F12 Prescriptions, F13/F21 Sync, F14/F18 WhatsApp Webhook, F16 OCR, F17 Regional Voice | **40** | Verify baseline functionality across all core endpoints and contracts (5 per feature) |
| **Tier 2** | Boundaries & Fault Injection | Injection tokens (NoSQL/XSS), expired/malformed JWT, out-of-range geo coordinates, malformed TwiML/webhooks, circuit breaker trips, simulated DB disconnects | **18** | Verify 4-layer crash resilience, RFC 7807 error format, and graceful degradation |
| **Tier 3** | Pairwise Combinations | Offline mutation queue -> Sync -> WhatsApp inquiry; OCR parsing -> Pharmacy stock locator; Language setting -> Regional voice; Breaker trip -> recovery; Seed data -> geo sync | **5** | Verify cross-subsystem contracts and data propagation |
| **Tier 4** | Real-World Workloads | Elderly Hindi voice flow (Rameshwaridevi, 72); Kannada prescription OCR & reminders (Venkatesh Murthy, 68); Offline caregiver sync flow | **3** | Validate realistic end-user persona journeys end-to-end |
| **Total** | | | **66** | Complete E2E coverage of Quick Sanjeevani Phase 1 MVP |

---

## 4. Invocation Syntax & CLI Flags

```bash
# Run all tiers (default)
node tests/e2e-runner.js
# Or via npm script:
npm run test:e2e

# Run specific tier
node tests/e2e-runner.js --tier=1
node tests/e2e-runner.js --tier=2
node tests/e2e-runner.js --tier=3
node tests/e2e-runner.js --tier=4
node tests/e2e-runner.js --tier=all

# Force ephemeral in-memory mock harness (hermetic CI mode)
node tests/e2e-runner.js --mock

# Force live server target
node tests/e2e-runner.js --live --server=http://localhost:5000 --bot=http://localhost:5001

# Verbose output (logs request/response payloads)
node tests/e2e-runner.js --verbose

# Stop on first failure
node tests/e2e-runner.js --bail
```

---

## 5. Coverage & Quality Thresholds

- **Pass Threshold**: 100% of executed tests must pass (0 failures).
- **Latency Thresholds**:
  - Fast Webhook ACK: `< 50ms` design target (hard test threshold: `< 200ms`).
  - Health check response: `< 100ms`.
  - Geospatial query: `< 250ms`.
- **Fault Resilience Threshold**: 0 unhandled promise rejections or process crashes during Tier 2 fault injection.
- **Contract Adherence**:
  - Delta Sync: WatermelonDB push/pull format (`lastPulledAt`, `changes: { medicines, prescriptions, reminders }`).
  - WhatsApp: Twilio URL-encoded input and synchronous `<Response></Response>` XML ACK.
  - Server Errors: RFC 7807 problem details JSON format.

---

## 6. Environment & Transport Adaptability

| Environment | Transport Mechanism | Reason |
|:---|:---|:---|
| Windows Restricted Sandbox | Windows Named Pipe (`\\\\.\\pipe\\...`) | Bypasses local TCP socket `EACCES` sandbox policy; latency < 10ms |
| Unrestricted Local / CI | TCP Sockets (`http://localhost:5000`) | Standard network socket communication |
| Headless Mock Runner | In-Memory Ephemeral HTTP Server | Zero external dependency (runs without MongoDB or PM2) |
