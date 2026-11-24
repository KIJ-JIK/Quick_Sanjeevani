/**
 * Quick Sanjeevani - WatermelonDB-Compatible Delta Sync Service
 * Implements bidirectional push/pull delta synchronization:
 * - Push: collects offline mutations from sync_queue and pending records,
 *   builds WatermelonDB change set, sends to /api/sync, marks items synced.
 * - Pull: retrieves server delta since lastPulledAt, applies created/updated/deleted
 *   records to local SQLite/persistence store.
 * - Conflict resolution: server timestamp priority.
 * - Network resilience: handles offline disconnects gracefully without data loss.
 */

const { TABLES, SYNC_STATUS, SYNC_QUEUE_STATUS } = require('../database/schema');

class SyncService {
  constructor(options = {}) {
    this.isSyncing = false;
    this.lastSyncResult = null;
  }

  /**
   * Main synchronization routine: Push pending local changes, then Pull server updates.
   * Compatible with WatermelonDB delta sync endpoint POST /api/sync.
   */
  async sync(apiClient, db) {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress',
        isSyncing: true,
      };
    }

    this.isSyncing = true;
    const lastPulledAt = db.getLastPulledAt() || 0;

    try {
      // 1. Gather local pending mutations to Push
      const pendingQueue = await db.getPendingSync();
      const changesToPush = {
        prescriptions: { created: [], updated: [], deleted: [] },
        reminders: { created: [], updated: [], deleted: [] },
      };

      const pushedItemIds = [];

      for (const item of pendingQueue) {
        pushedItemIds.push(item);
        const table = item.table_name;
        const action = item.action;
        const payload = item.payload || {};

        if (changesToPush[table]) {
          if (action === 'create') {
            changesToPush[table].created.push({ id: item.record_id, ...payload });
          } else if (action === 'update') {
            changesToPush[table].updated.push({ id: item.record_id, ...payload });
          } else if (action === 'delete') {
            changesToPush[table].deleted.push(item.record_id);
          }
        }
      }

      // Also detect any unqueued records with pending status flags
      for (const tableName of [TABLES.PRESCRIPTIONS, TABLES.REMINDERS]) {
        const pendingRecords = await db.find(tableName, (r) => r.sync_status && r.sync_status.startsWith('pending_'));
        for (const rec of pendingRecords) {
          const alreadyPushed = pushedItemIds.some((q) => q.record_id === rec.id);
          if (!alreadyPushed) {
            if (rec.sync_status === SYNC_STATUS.PENDING_CREATE) {
              changesToPush[tableName].created.push({ ...rec });
            } else if (rec.sync_status === SYNC_STATUS.PENDING_UPDATE) {
              changesToPush[tableName].updated.push({ ...rec });
            } else if (rec.sync_status === SYNC_STATUS.PENDING_DELETE) {
              changesToPush[tableName].deleted.push(rec.id);
            }
          }
        }
      }

      // 2. Dispatch bidirectional sync payload to /api/sync
      const response = await apiClient.sync(lastPulledAt, changesToPush);
      const serverTimestamp = response.timestamp || Date.now();
      const serverChanges = response.changes || {};

      // 3. Mark successfully pushed local items as SYNCED
      for (const queueItem of pushedItemIds) {
        await db.markSyncCompleted(queueItem.id, queueItem.record_id);
      }

      for (const tableName of [TABLES.PRESCRIPTIONS, TABLES.REMINDERS]) {
        const pending = await db.find(tableName, (r) => r.sync_status && r.sync_status.startsWith('pending_'));
        for (const p of pending) {
          await db.update(tableName, p.id, { sync_status: SYNC_STATUS.SYNCED });
        }
      }

      // 4. Apply pulled server changes into local DB
      let pulledCount = 0;

      // Apply medicines
      if (serverChanges.medicines) {
        const { created = [], updated = [], deleted = [] } = serverChanges.medicines;
        for (const med of created) {
          const existing = await db.findById(TABLES.MEDICINES, med.id);
          const normalized = {
            id: med.id,
            name: med.name,
            generic_name: med.genericName || med.generic_name || med.name,
            category: med.category || 'General',
            dosage: med.strength || med.dosage || '',
            form: med.dosageForm || med.form || 'Tablet',
            manufacturer: med.manufacturer || 'Pharma',
            price: typeof med.price === 'number' ? med.price : 0,
            stock: typeof med.stock === 'number' ? med.stock : 0,
            schedule: med.schedule || (med.requiresPrescription ? 'Schedule H' : 'OTC'),
            instructions: med.instructions || '',
            requires_prescription: Boolean(med.requiresPrescription),
            sync_status: SYNC_STATUS.SYNCED,
          };
          if (!existing) {
            await db.insert(TABLES.MEDICINES, normalized);
          } else {
            await db.update(TABLES.MEDICINES, med.id, normalized);
          }
          pulledCount++;
        }

        for (const med of updated) {
          await db.update(TABLES.MEDICINES, med.id, {
            ...med,
            sync_status: SYNC_STATUS.SYNCED,
          });
          pulledCount++;
        }

        for (const id of deleted) {
          await db.delete(TABLES.MEDICINES, id);
          pulledCount++;
        }
      }

      // Apply prescriptions
      if (serverChanges.prescriptions) {
        const { created = [], updated = [], deleted = [] } = serverChanges.prescriptions;
        for (const rx of created) {
          const existing = await db.findById(TABLES.PRESCRIPTIONS, rx.id);
          if (!existing) {
            await db.insert(TABLES.PRESCRIPTIONS, {
              ...rx,
              id: rx.id,
              sync_status: SYNC_STATUS.SYNCED,
            });
            pulledCount++;
          } else {
            // Conflict resolution: server timestamp priority
            const serverDate = rx.updatedAt ? new Date(rx.updatedAt).getTime() : serverTimestamp;
            const localDate = existing.updated_at || 0;
            if (serverDate >= localDate) {
              await db.update(TABLES.PRESCRIPTIONS, rx.id, {
                ...rx,
                sync_status: SYNC_STATUS.SYNCED,
              });
              pulledCount++;
            }
          }
        }

        for (const rx of updated) {
          const existing = await db.findById(TABLES.PRESCRIPTIONS, rx.id);
          if (existing) {
            const serverDate = rx.updatedAt ? new Date(rx.updatedAt).getTime() : serverTimestamp;
            const localDate = existing.updated_at || 0;
            if (serverDate >= localDate) {
              await db.update(TABLES.PRESCRIPTIONS, rx.id, {
                ...rx,
                sync_status: SYNC_STATUS.SYNCED,
              });
              pulledCount++;
            }
          } else {
            await db.insert(TABLES.PRESCRIPTIONS, {
              ...rx,
              id: rx.id,
              sync_status: SYNC_STATUS.SYNCED,
            });
            pulledCount++;
          }
        }

        for (const id of deleted) {
          await db.delete(TABLES.PRESCRIPTIONS, id);
          pulledCount++;
        }
      }

      // Apply reminders
      if (serverChanges.reminders) {
        const { created = [], updated = [], deleted = [] } = serverChanges.reminders;
        for (const rem of created) {
          const existing = await db.findById(TABLES.REMINDERS, rem.id);
          if (!existing) {
            await db.insert(TABLES.REMINDERS, {
              ...rem,
              id: rem.id,
              sync_status: SYNC_STATUS.SYNCED,
            });
            pulledCount++;
          } else {
            const serverDate = rem.updatedAt ? new Date(rem.updatedAt).getTime() : serverTimestamp;
            const localDate = existing.updated_at || 0;
            if (serverDate >= localDate) {
              await db.update(TABLES.REMINDERS, rem.id, {
                ...rem,
                sync_status: SYNC_STATUS.SYNCED,
              });
              pulledCount++;
            }
          }
        }

        for (const rem of updated) {
          const existing = await db.findById(TABLES.REMINDERS, rem.id);
          if (existing) {
            const serverDate = rem.updatedAt ? new Date(rem.updatedAt).getTime() : serverTimestamp;
            const localDate = existing.updated_at || 0;
            if (serverDate >= localDate) {
              await db.update(TABLES.REMINDERS, rem.id, {
                ...rem,
                sync_status: SYNC_STATUS.SYNCED,
              });
              pulledCount++;
            }
          } else {
            await db.insert(TABLES.REMINDERS, {
              ...rem,
              id: rem.id,
              sync_status: SYNC_STATUS.SYNCED,
            });
            pulledCount++;
          }
        }

        for (const id of deleted) {
          await db.delete(TABLES.REMINDERS, id);
          pulledCount++;
        }
      }

      // 5. Update local lastPulledAt
      db.setLastPulledAt(serverTimestamp);

      const result = {
        success: true,
        pushedCount: pushedItemIds.length,
        pulledCount,
        timestamp: serverTimestamp,
        error: null,
      };

      this.lastSyncResult = result;
      this.isSyncing = false;
      return result;
    } catch (err) {
      // Offline / Network error handling
      const isOffline = Boolean(err.isOffline || err.isTimeout || err.code === 'ECONNREFUSED');
      
      const result = {
        success: false,
        offline: isOffline,
        error: err.message,
        pushedCount: 0,
        pulledCount: 0,
        timestamp: lastPulledAt,
      };

      this.lastSyncResult = result;
      this.isSyncing = false;
      return result;
    }
  }

  getLastSyncResult() {
    return this.lastSyncResult;
  }
}

const defaultSyncService = new SyncService();

module.exports = {
  SyncService,
  syncService: defaultSyncService,
};
