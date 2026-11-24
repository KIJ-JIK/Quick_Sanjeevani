/**
 * Quick Sanjeevani - Local Database Schema
 * Defines table schemas, column types, primary keys, indices, and sync status fields.
 * Compatible with WatermelonDB push/pull delta sync protocol.
 */

const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING_CREATE: 'pending_create',
  PENDING_UPDATE: 'pending_update',
  PENDING_DELETE: 'pending_delete',
};

const SYNC_QUEUE_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
};

const TABLES = {
  MEDICINES: 'medicines',
  PRESCRIPTIONS: 'prescriptions',
  REMINDERS: 'reminders',
  SYNC_QUEUE: 'sync_queue',
};

const schema = {
  version: 1,
  tables: {
    [TABLES.MEDICINES]: {
      name: TABLES.MEDICINES,
      primaryKey: 'id',
      columns: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true, indexed: true },
        generic_name: { type: 'string', indexed: true },
        category: { type: 'string', indexed: true },
        dosage: { type: 'string' },
        form: { type: 'string' },
        manufacturer: { type: 'string' },
        price: { type: 'number', default: 0 },
        stock: { type: 'number', default: 0 },
        schedule: { type: 'string', default: 'OTC' },
        side_effects: { type: 'json', default: [] },
        instructions: { type: 'string' },
        requires_prescription: { type: 'boolean', default: false },
        sync_status: { type: 'string', default: SYNC_STATUS.SYNCED, indexed: true },
        created_at: { type: 'number', default: () => Date.now() },
        updated_at: { type: 'number', default: () => Date.now() },
      },
      indices: ['id', 'name', 'generic_name', 'category', 'sync_status'],
    },

    [TABLES.PRESCRIPTIONS]: {
      name: TABLES.PRESCRIPTIONS,
      primaryKey: 'id',
      columns: {
        id: { type: 'string', required: true },
        patient_id: { type: 'string', indexed: true },
        patient_name: { type: 'string' },
        doctor_name: { type: 'string' },
        clinic_name: { type: 'string' },
        diagnosis: { type: 'string' },
        date: { type: 'string' },
        medicines: { type: 'json', default: [] },
        notes: { type: 'string' },
        status: { type: 'string', default: 'active', indexed: true },
        sync_status: { type: 'string', default: SYNC_STATUS.PENDING_CREATE, indexed: true },
        created_at: { type: 'number', default: () => Date.now() },
        updated_at: { type: 'number', default: () => Date.now() },
      },
      indices: ['id', 'patient_id', 'status', 'sync_status'],
    },

    [TABLES.REMINDERS]: {
      name: TABLES.REMINDERS,
      primaryKey: 'id',
      columns: {
        id: { type: 'string', required: true },
        prescription_id: { type: 'string', indexed: true },
        user_id: { type: 'string', indexed: true },
        medicine_name: { type: 'string', required: true, indexed: true },
        dosage: { type: 'string' },
        time: { type: 'string', required: true },
        days_of_week: { type: 'json', default: [] },
        status: { type: 'string', default: 'pending', indexed: true }, // 'pending', 'taken', 'skipped'
        taken_at: { type: 'number', default: null },
        is_active: { type: 'boolean', default: true },
        whatsapp_alert: { type: 'boolean', default: true },
        sync_status: { type: 'string', default: SYNC_STATUS.PENDING_CREATE, indexed: true },
        created_at: { type: 'number', default: () => Date.now() },
        updated_at: { type: 'number', default: () => Date.now() },
      },
      indices: ['id', 'prescription_id', 'user_id', 'status', 'sync_status'],
    },

    [TABLES.SYNC_QUEUE]: {
      name: TABLES.SYNC_QUEUE,
      primaryKey: 'id',
      columns: {
        id: { type: 'string', required: true },
        table_name: { type: 'string', required: true, indexed: true },
        record_id: { type: 'string', required: true, indexed: true },
        action: { type: 'string', required: true }, // 'create', 'update', 'delete'
        payload: { type: 'json', default: {} },
        status: { type: 'string', default: SYNC_QUEUE_STATUS.PENDING, indexed: true },
        retry_count: { type: 'number', default: 0 },
        error: { type: 'string', default: null },
        created_at: { type: 'number', default: () => Date.now() },
        updated_at: { type: 'number', default: () => Date.now() },
      },
      indices: ['id', 'table_name', 'record_id', 'status'],
    },
  },
};

module.exports = {
  TABLES,
  SYNC_STATUS,
  SYNC_QUEUE_STATUS,
  schema,
};
