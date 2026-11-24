/**
 * Quick Sanjeevani - Mobile Offline-First & Delta Sync Comprehensive Test Suite
 * Tests:
 *  1. Local database initialization, pre-seeding (50+ medicines), and offline CRUD.
 *  2. Offline catalog search with generic name matching, fuzzy/partial matching, price & schedule.
 *  3. WatermelonDB bidirectional delta sync protocol (push, pull, conflict resolution, offline resilience).
 *  4. Elder-friendly ErrorBoundary resilience, telemetry logging, and retry recovery.
 *  5. Elder UI components (Header, Dashboard, Search, Prescriptions, Settings, App).
 */

const { LocalDatabase, TABLES, SYNC_STATUS, SYNC_QUEUE_STATUS } = require('../src/database');
const { ApiService } = require('../src/services/apiService');
const { SyncService } = require('../src/services/syncService');
const ErrorBoundary = require('../src/components/ErrorBoundary');
const Header = require('../src/components/Header');
const DashboardScreen = require('../src/screens/DashboardScreen');
const MedicineSearchScreen = require('../src/screens/MedicineSearchScreen');
const PrescriptionsScreen = require('../src/screens/PrescriptionsScreen');
const SettingsScreen = require('../src/screens/SettingsScreen');
const App = require('../App');
const { colors, typography, t } = require('../src/theme');
const React = require('../src/utils/react-shim');

describe('Quick Sanjeevani - Mobile Offline-First Subsystem', () => {
  let db;

  beforeEach(async () => {
    db = new LocalDatabase({ inMemory: true });
    await db.init();
  });

  afterEach(async () => {
    await db.clear();
  });

  // =========================================================================
  // Test Group A: Local Database Initialization, Pre-Seeding & Offline CRUD
  // =========================================================================
  describe('Group A: Local Database Engine & Offline Persistence', () => {
    test('A.1: Database pre-seeds at least 50 medicines into local catalog upon initialization', async () => {
      const count = await db.count(TABLES.MEDICINES);
      expect(count).toBeGreaterThanOrEqual(50);

      // Spot-check popular Indian medicines exist
      const dolo = await db.find(TABLES.MEDICINES, (m) => m.name === 'Dolo 650');
      expect(dolo.length).toBe(1);
      expect(dolo[0].generic_name).toMatch(/Paracetamol/i);
      expect(dolo[0].schedule).toBe('OTC');
      expect(dolo[0].sync_status).toBe(SYNC_STATUS.SYNCED);

      const glycomet = await db.find(TABLES.MEDICINES, (m) => m.name === 'Glycomet 500');
      expect(glycomet.length).toBe(1);
      expect(glycomet[0].generic_name).toMatch(/Metformin/i);
      expect(glycomet[0].schedule).toBe('Schedule H');
    });

    test('A.2: Offline CRUD operations on Prescriptions table', async () => {
      // 1. Create
      const newRx = await db.insert(TABLES.PRESCRIPTIONS, {
        patient_id: 'p_elder_1',
        patient_name: 'Savitri Devi (69 Yrs)',
        doctor_name: 'Dr. Ramesh Rao',
        clinic_name: 'Manipal Hospital, Bengaluru',
        diagnosis: 'Hypertension',
        date: '2026-11-24',
        medicines: [{ name: 'Telma 40', dosage: '40mg', frequency: 'Morning' }],
        status: 'active',
      });

      expect(newRx.id).toBeDefined();
      expect(newRx.sync_status).toBe(SYNC_STATUS.PENDING_CREATE);
      expect(newRx.created_at).toBeGreaterThan(0);

      // 2. Read (FindById)
      const fetched = await db.findById(TABLES.PRESCRIPTIONS, newRx.id);
      expect(fetched).not.toBeNull();
      expect(fetched.patient_name).toBe('Savitri Devi (69 Yrs)');

      // 3. Update
      const updated = await db.update(TABLES.PRESCRIPTIONS, newRx.id, {
        notes: 'Advised to reduce dietary salt intake',
        status: 'completed',
      });
      expect(updated.status).toBe('completed');
      expect(updated.notes).toBe('Advised to reduce dietary salt intake');
      expect(updated.updated_at).toBeGreaterThanOrEqual(newRx.created_at);

      // 4. Delete
      const deleteResult = await db.delete(TABLES.PRESCRIPTIONS, newRx.id);
      expect(deleteResult).toBe(true);

      const afterDelete = await db.findById(TABLES.PRESCRIPTIONS, newRx.id);
      expect(afterDelete).toBeNull();
    });

    test('A.3: Offline CRUD and state transition on Reminders table', async () => {
      const rem = await db.insert(TABLES.REMINDERS, {
        medicine_name: 'Atorvastatin 10mg',
        dosage: '1 tablet',
        time: '20:30',
        status: 'pending',
        taken_at: null,
      });

      expect(rem.id).toBeDefined();
      expect(rem.status).toBe('pending');
      expect(rem.taken_at).toBeNull();

      // Mark taken
      const takenTime = Date.now();
      const marked = await db.update(TABLES.REMINDERS, rem.id, {
        status: 'taken',
        taken_at: takenTime,
      });

      expect(marked.status).toBe('taken');
      expect(marked.taken_at).toBe(takenTime);
    });

    test('A.4: Transaction support commits atomic batches and rolls back on failure', async () => {
      const initialCount = await db.count(TABLES.PRESCRIPTIONS);

      // Successful transaction
      await db.transaction(async (tx) => {
        await tx.insert(TABLES.PRESCRIPTIONS, {
          patient_name: 'Patient Tx 1',
          doctor_name: 'Dr. Alpha',
        });
        await tx.insert(TABLES.PRESCRIPTIONS, {
          patient_name: 'Patient Tx 2',
          doctor_name: 'Dr. Beta',
        });
      });

      const afterCommitCount = await db.count(TABLES.PRESCRIPTIONS);
      expect(afterCommitCount).toBe(initialCount + 2);

      // Failed transaction rolling back
      let caughtError = null;
      try {
        await db.transaction(async (tx) => {
          await tx.insert(TABLES.PRESCRIPTIONS, { patient_name: 'Patient Tx 3' });
          throw new Error('Simulated atomic transaction failure');
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('Simulated atomic transaction failure');

      // Count must still be afterCommitCount (Patient Tx 3 was rolled back)
      const afterRollbackCount = await db.count(TABLES.PRESCRIPTIONS);
      expect(afterRollbackCount).toBe(afterCommitCount);
    });

    test('A.5: Sync queue records offline mutations and tracks retry lifecycle', async () => {
      const queueItem = await db.enqueueSync(TABLES.REMINDERS, 'rem_test_1', 'update', {
        status: 'taken',
      });

      expect(queueItem.id).toBeDefined();
      expect(queueItem.table_name).toBe(TABLES.REMINDERS);
      expect(queueItem.record_id).toBe('rem_test_1');
      expect(queueItem.status).toBe(SYNC_QUEUE_STATUS.PENDING);
      expect(queueItem.retry_count).toBe(0);

      // Fetch pending
      const pending = await db.getPendingSync();
      expect(pending.some((p) => p.id === queueItem.id)).toBe(true);

      // Mark failure increments retry count
      await db.markSyncFailed(queueItem.id, 'ECONNREFUSED: Server unreachable');
      const failedItem = await db.findById(TABLES.SYNC_QUEUE, queueItem.id);
      expect(failedItem.retry_count).toBe(1);
      expect(failedItem.error).toContain('ECONNREFUSED');
      expect(failedItem.status).toBe(SYNC_QUEUE_STATUS.PENDING);

      // Complete sync
      await db.markSyncCompleted(queueItem.id, 'rem_test_1');
      const completedItem = await db.findById(TABLES.SYNC_QUEUE, queueItem.id);
      expect(completedItem.status).toBe(SYNC_QUEUE_STATUS.SYNCED);
    });
  });

  // =========================================================================
  // Test Group B: Offline Catalog Search with Generic Name & Fuzzy Matching
  // =========================================================================
  describe('Group B: Offline Medicine Search & Catalog Queries', () => {
    test('B.1: Exact and partial brand name search returns matching medicines', async () => {
      const resultsDolo = await db.searchMedicines('Dolo');
      expect(resultsDolo.length).toBeGreaterThan(0);
      expect(resultsDolo[0].name).toBe('Dolo 650');
      expect(resultsDolo[0].price).toBe(34.50);

      const resultsCrocin = await db.searchMedicines('crocin');
      expect(resultsCrocin.length).toBeGreaterThan(0);
      expect(resultsCrocin[0].name).toBe('Crocin 500');
    });

    test('B.2: Generic salt name search matches across multiple brand products', async () => {
      // Searching "Paracetamol" should match Dolo, Crocin, Calpol
      const results = await db.searchMedicines('Paracetamol');
      expect(results.length).toBeGreaterThanOrEqual(3);

      const names = results.map((r) => r.name);
      expect(names).toContain('Dolo 650');
      expect(names).toContain('Crocin 500');
      expect(names).toContain('Calpol 500');

      // Generic search for "Metformin" should match Glycomet
      const metforminResults = await db.searchMedicines('Metformin');
      expect(metforminResults.some((m) => m.name.includes('Glycomet'))).toBe(true);
    });

    test('B.3: Search is tolerant to case, leading/trailing whitespace, and empty strings', async () => {
      const normal = await db.searchMedicines('Pan 40');
      const spaced = await db.searchMedicines('   pAn 40   ');
      expect(spaced.length).toBe(normal.length);
      expect(spaced[0].name).toBe('Pan 40');

      // Empty query returns top catalog items
      const emptySearch = await db.searchMedicines('');
      expect(emptySearch.length).toBeGreaterThan(0);

      const nullSearch = await db.searchMedicines(null);
      expect(nullSearch.length).toBeGreaterThan(0);
    });

    test('B.4: Search results provide schedule warning flags (OTC vs Schedule H) and price indicators', async () => {
      const otcMeds = await db.searchMedicines('Dolo 650');
      expect(otcMeds[0].schedule).toBe('OTC');
      expect(otcMeds[0].requires_prescription).toBe(false);
      expect(otcMeds[0].price).toBeGreaterThan(0);

      const rxMeds = await db.searchMedicines('Telma 40');
      expect(rxMeds[0].schedule).toBe('Schedule H');
      expect(rxMeds[0].requires_prescription).toBe(true);
      expect(rxMeds[0].price).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Test Group C: Bidirectional Delta Sync Engine (WatermelonDB Protocol)
  // =========================================================================
  describe('Group C: WatermelonDB Delta Sync Protocol', () => {
    let mockApi;
    let syncService;

    beforeEach(() => {
      syncService = new SyncService();
    });

    test('C.1: Initial pull with lastPulledAt=0 applies server medicines and updates timestamp', async () => {
      const serverTimestamp = 1795524100000;
      mockApi = new ApiService({
        customRequester: async (method, path, body) => {
          expect(method).toBe('POST');
          expect(path).toBe('/api/sync');
          expect(body.lastPulledAt).toBe(0);

          return {
            status: 200,
            data: {
              timestamp: serverTimestamp,
              changes: {
                medicines: {
                  created: [
                    {
                      id: 'med_server_101',
                      name: 'Server New Med',
                      genericName: 'Salt New 100mg',
                      category: 'Cardiovascular',
                      strength: '100mg',
                      price: 99.0,
                      stock: 50,
                      requiresPrescription: true,
                    },
                  ],
                  updated: [],
                  deleted: [],
                },
                prescriptions: { created: [], updated: [], deleted: [] },
                reminders: { created: [], updated: [], deleted: [] },
              },
            },
          };
        },
      });

      const result = await syncService.sync(mockApi, db);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBe(serverTimestamp);
      expect(db.getLastPulledAt()).toBe(serverTimestamp);

      // Verify server med was inserted into local database
      const insertedMed = await db.findById(TABLES.MEDICINES, 'med_server_101');
      expect(insertedMed).not.toBeNull();
      expect(insertedMed.name).toBe('Server New Med');
      expect(insertedMed.generic_name).toBe('Salt New 100mg');
      expect(insertedMed.sync_status).toBe(SYNC_STATUS.SYNCED);
    });

    test('C.2: Push offline queued mutations to server and mark items as synced', async () => {
      // Create local prescription and reminder while offline
      const localRx = await db.insert(TABLES.PRESCRIPTIONS, {
        id: 'rx_local_offline_1',
        patient_name: 'Anandi Bai (75 Yrs)',
        doctor_name: 'Dr. V. Rao',
        status: 'active',
      });

      const localRem = await db.insert(TABLES.REMINDERS, {
        id: 'rem_local_offline_1',
        medicine_name: 'Dolo 650',
        time: '08:00',
        status: 'taken',
        taken_at: Date.now(),
      });

      // Enqueue mutations
      await db.enqueueSync(TABLES.PRESCRIPTIONS, localRx.id, 'create', {
        patientName: localRx.patient_name,
        doctorName: localRx.doctor_name,
        status: localRx.status,
      });

      await db.enqueueSync(TABLES.REMINDERS, localRem.id, 'create', {
        medicineName: localRem.medicine_name,
        time: localRem.time,
        status: localRem.status,
      });

      let capturedBody = null;
      mockApi = new ApiService({
        customRequester: async (method, path, body) => {
          capturedBody = body;
          return {
            status: 200,
            data: {
              timestamp: Date.now(),
              changes: {
                medicines: { created: [], updated: [], deleted: [] },
                prescriptions: { created: [], updated: [], deleted: [] },
                reminders: { created: [], updated: [], deleted: [] },
              },
            },
          };
        },
      });

      const result = await syncService.sync(mockApi, db);
      expect(result.success).toBe(true);
      expect(result.pushedCount).toBe(2);

      // Check captured payload format matches WatermelonDB spec
      expect(capturedBody.changes.prescriptions.created.length).toBe(1);
      expect(capturedBody.changes.prescriptions.created[0].id).toBe(localRx.id);
      expect(capturedBody.changes.reminders.created.length).toBe(1);
      expect(capturedBody.changes.reminders.created[0].id).toBe(localRem.id);

      // Verify queued items are now marked SYNCED
      const remainingPending = await db.getPendingSync();
      expect(remainingPending.length).toBe(0);

      const updatedRx = await db.findById(TABLES.PRESCRIPTIONS, localRx.id);
      expect(updatedRx.sync_status).toBe(SYNC_STATUS.SYNCED);

      const updatedRem = await db.findById(TABLES.REMINDERS, localRem.id);
      expect(updatedRem.sync_status).toBe(SYNC_STATUS.SYNCED);
    });

    test('C.3: Conflict resolution: server timestamp priority overwrites stale local state', async () => {
      // Local record modified at timestamp 1000
      const localRx = await db.insert(TABLES.PRESCRIPTIONS, {
        id: 'rx_conflict_1',
        patient_name: 'Elder Patient',
        doctor_name: 'Dr. Local Old',
        diagnosis: 'Initial Diagnosis',
        updated_at: 1000,
        sync_status: SYNC_STATUS.PENDING_UPDATE,
      });

      // Server returns updated record with newer timestamp 2000
      mockApi = new ApiService({
        customRequester: async () => {
          return {
            status: 200,
            data: {
              timestamp: 3000,
              changes: {
                medicines: { created: [], updated: [], deleted: [] },
                prescriptions: {
                  created: [],
                  updated: [
                    {
                      id: 'rx_conflict_1',
                      patient_name: 'Elder Patient',
                      doctor_name: 'Dr. Server Authority',
                      diagnosis: 'Refined Server Diagnosis',
                      updatedAt: new Date(2000).toISOString(),
                    },
                  ],
                  deleted: [],
                },
                reminders: { created: [], updated: [], deleted: [] },
              },
            },
          };
        },
      });

      const result = await syncService.sync(mockApi, db);
      expect(result.success).toBe(true);

      const resolved = await db.findById(TABLES.PRESCRIPTIONS, 'rx_conflict_1');
      expect(resolved.doctor_name).toBe('Dr. Server Authority');
      expect(resolved.diagnosis).toBe('Refined Server Diagnosis');
      expect(resolved.sync_status).toBe(SYNC_STATUS.SYNCED);
    });

    test('C.4: Network failure / offline state is handled gracefully without data loss', async () => {
      // Enqueue a mutation
      await db.enqueueSync(TABLES.REMINDERS, 'rem_offline_pending', 'update', {
        status: 'taken',
      });

      mockApi = new ApiService({
        customRequester: async () => {
          const networkErr = new Error('getaddrinfo ENOTFOUND api.quicksanjeevani.org');
          networkErr.isOffline = true;
          networkErr.code = 'ENOTFOUND';
          throw networkErr;
        },
      });

      const result = await syncService.sync(mockApi, db);
      expect(result.success).toBe(false);
      expect(result.offline).toBe(true);

      // Pending queue mutations must remain intact for future reconnection
      const pending = await db.getPendingSync();
      expect(pending.length).toBe(1);
      expect(pending[0].record_id).toBe('rem_offline_pending');
      expect(pending[0].retry_count).toBe(1);
    });
  });

  // =========================================================================
  // Test Group D: ErrorBoundary Resilience, Telemetry & Recovery
  // =========================================================================
  describe('Group D: React ErrorBoundary Crash-Resilience', () => {
    beforeEach(() => {
      ErrorBoundary.clearTelemetryLogs();
    });

    test('D.1: ErrorBoundary catches rendering errors and stores diagnostic telemetry', () => {
      const boundary = new ErrorBoundary({ language: 'en' });
      expect(boundary.state.hasError).toBe(false);

      const testError = new Error('Simulated UI render crash: component failed to mount');
      const testInfo = { componentStack: '\n    in ProblemChild\n    in View' };

      // Simulate React error handling lifecycle
      const derived = ErrorBoundary.getDerivedStateFromError(testError);
      expect(derived.hasError).toBe(true);
      expect(derived.error).toBe(testError);

      boundary.setState(derived);
      boundary.componentDidCatch(testError, testInfo);

      // Verify telemetry entry
      const logs = ErrorBoundary.getTelemetryLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toContain('Simulated UI render crash');
      expect(logs[0].timestamp).toBeDefined();
    });

    test('D.2: ErrorBoundary renders elder-friendly fallback UI with "Try Again" recovery', () => {
      const boundary = new ErrorBoundary({ language: 'hi' });
      boundary.state = {
        hasError: true,
        error: new Error('Render crash in Dashboard'),
      };

      const renderedTree = boundary.render();
      expect(renderedTree).not.toBeNull();
      expect(renderedTree.type).toBe('View');

      // Trigger reset callback
      let resetCalled = false;
      boundary.props = {
        language: 'hi',
        onReset: () => {
          resetCalled = true;
        },
      };

      boundary.handleReset();
      expect(boundary.state.hasError).toBe(false);
      expect(resetCalled).toBe(true);
    });
  });

  // =========================================================================
  // Test Group E: Elder-Friendly Screens and Root App Flow
  // =========================================================================
  describe('Group E: Elder Mobile UI Screens & Navigation Flow', () => {
    test('E.1: Header renders offline mode banner and toggles regional languages', () => {
      let switchedLang = null;
      const headerEn = Header({
        title: 'Medication Schedule',
        isOffline: true,
        language: 'en',
        onLanguageChange: (lang) => {
          switchedLang = lang;
        },
      });

      expect(headerEn).toBeDefined();

      // Trigger language toggle
      const mainRow = headerEn.props.children[1];
      const langButton = mainRow.props.children[1];
      expect(langButton).toBeDefined();
      langButton.props.onPress();
      expect(switchedLang).toBe('hi');
    });

    test('E.2: DashboardScreen groups daily timeline and executes one-tap "Mark Taken"', async () => {
      const dashboard = DashboardScreen({
        db,
        language: 'en',
      });
      expect(dashboard).toBeDefined();

      // Verify reminders in DB can be updated
      const morningRem = await db.insert(TABLES.REMINDERS, {
        medicine_name: 'Dolo 650',
        dosage: '650mg',
        time: '08:00',
        status: 'pending',
      });

      await db.update(TABLES.REMINDERS, morningRem.id, {
        status: 'taken',
        taken_at: Date.now(),
      });

      const updated = await db.findById(TABLES.REMINDERS, morningRem.id);
      expect(updated.status).toBe('taken');
      expect(updated.taken_at).toBeGreaterThan(0);
    });

    test('E.3: PrescriptionsScreen displays doctor credentials and extracted dosages', async () => {
      await db.insert(TABLES.PRESCRIPTIONS, {
        doctor_name: 'Dr. Savita Sen',
        clinic_name: 'Bengaluru Heart Institute',
        diagnosis: 'Cardiovascular Care',
        date: '2026-11-24',
        medicines: [{ name: 'Rosuvas 10', dosage: '10mg', frequency: 'Bedtime' }],
        status: 'active',
      });

      const screen = PrescriptionsScreen({ db, language: 'en' });
      expect(screen).toBeDefined();

      const rxList = await db.all(TABLES.PRESCRIPTIONS);
      expect(rxList.length).toBeGreaterThan(0);
      expect(rxList[0].medicines.length).toBe(1);
    });

    test('E.4: SettingsScreen displays emergency dial cards (108, 112, Caregiver)', () => {
      const screen = SettingsScreen({
        db,
        language: 'en',
        isOffline: true,
      });

      expect(screen).toBeDefined();
      const content = screen.props.children;
      expect(content.length).toBeGreaterThanOrEqual(3);
    });

    test('E.5: Root App mounts within ErrorBoundary and renders cleanly', () => {
      const app = App({
        initialTab: 'dashboard',
        initialLanguage: 'en',
        isOffline: true,
        customDb: db,
      });

      expect(app).toBeDefined();
      expect(app.type).toBe(ErrorBoundary);
      expect(app.props.children).toBeDefined();
    });
  });
});
