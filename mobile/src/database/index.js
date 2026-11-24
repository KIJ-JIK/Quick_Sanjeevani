/**
 * Quick Sanjeevani - Local Database Engine
 * Pure offline persistence, transaction support, CRUD operations,
 * pre-seeded medicine catalog loader, fuzzy offline search, and sync queue management.
 */

const fs = require('fs');
const path = require('path');
const { crypto } = typeof global !== 'undefined' && global.crypto ? global : { crypto: require('crypto') };
const { TABLES, SYNC_STATUS, SYNC_QUEUE_STATUS, schema } = require('./schema');

// Embedded fallback seed catalog ensuring 50+ medicines are guaranteed offline
const EMBEDDED_SEED_MEDICINES = [
  { name: 'Dolo 650', genericName: 'Paracetamol 650mg', category: 'Analgesics & Antipyretics', strength: '650mg', dosageForm: 'Tablet', manufacturer: 'Micro Labs Ltd', price: 34.50, schedule: 'OTC', stock: 250, requiresPrescription: false, instructions: 'Take 1 tablet every 6-8 hours after food.' },
  { name: 'Crocin 500', genericName: 'Paracetamol 500mg', category: 'Analgesics & Antipyretics', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'GSK', price: 20.80, schedule: 'OTC', stock: 300, requiresPrescription: false, instructions: 'Take 1 tablet after meals with water.' },
  { name: 'Calpol 500', genericName: 'Paracetamol 500mg', category: 'Analgesics & Antipyretics', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'GSK', price: 18.25, schedule: 'OTC', stock: 180, requiresPrescription: false, instructions: 'Take 1 tablet every 6 hours post-meals.' },
  { name: 'Combiflam', genericName: 'Ibuprofen 400mg + Paracetamol 325mg', category: 'Analgesics & Antipyretics', strength: '400mg+325mg', dosageForm: 'Tablet', manufacturer: 'Sanofi India', price: 42.00, schedule: 'Schedule H', stock: 220, requiresPrescription: true, instructions: 'Take 1 tablet after lunch or dinner.' },
  { name: 'Meftal Spas', genericName: 'Dicyclomine 10mg + Mefenamic Acid 250mg', category: 'Analgesics & Antipyretics', strength: '10mg+250mg', dosageForm: 'Tablet', manufacturer: 'Blue Cross Labs', price: 48.50, schedule: 'Schedule H', stock: 95, requiresPrescription: true, instructions: 'Take 1 tablet when severe spasmodic pain occurs.' },
  { name: 'Glycomet 500', genericName: 'Metformin Hydrochloride 500mg', category: 'Antidiabetic', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'USV Pvt Ltd', price: 24.60, schedule: 'Schedule H', stock: 450, requiresPrescription: true, instructions: 'Take 1 tablet twice daily with morning and evening meals.' },
  { name: 'Glycomet GP 1', genericName: 'Glimepiride 1mg + Metformin 500mg', category: 'Antidiabetic', strength: '1mg+500mg', dosageForm: 'Tablet', manufacturer: 'USV Pvt Ltd', price: 78.00, schedule: 'Schedule H', stock: 200, requiresPrescription: true, instructions: 'Take 1 tablet just before breakfast.' },
  { name: 'Januvia 100', genericName: 'Sitagliptin 100mg', category: 'Antidiabetic', strength: '100mg', dosageForm: 'Tablet', manufacturer: 'MSD India', price: 385.00, schedule: 'Schedule H', stock: 60, requiresPrescription: true, instructions: 'Take 1 tablet once daily with or without food.' },
  { name: 'Galvus Met 50/500', genericName: 'Vildagliptin 50mg + Metformin 500mg', category: 'Antidiabetic', strength: '50mg+500mg', dosageForm: 'Tablet', manufacturer: 'Novartis', price: 240.00, schedule: 'Schedule H', stock: 110, requiresPrescription: true, instructions: 'Take 1 tablet twice daily with meals.' },
  { name: 'Amaryl 2mg', genericName: 'Glimepiride 2mg', category: 'Antidiabetic', strength: '2mg', dosageForm: 'Tablet', manufacturer: 'Sanofi India', price: 115.00, schedule: 'Schedule H', stock: 140, requiresPrescription: true, instructions: 'Take 1 tablet once daily before first main meal.' },
  { name: 'Telma 40', genericName: 'Telmisartan 40mg', category: 'Cardiovascular', strength: '40mg', dosageForm: 'Tablet', manufacturer: 'Glenmark Pharmaceuticals', price: 112.50, schedule: 'Schedule H', stock: 320, requiresPrescription: true, instructions: 'Take 1 tablet daily at 8:00 AM consistently.' },
  { name: 'Telma AM', genericName: 'Telmisartan 40mg + Amlodipine 5mg', category: 'Cardiovascular', strength: '40mg+5mg', dosageForm: 'Tablet', manufacturer: 'Glenmark Pharmaceuticals', price: 175.00, schedule: 'Schedule H', stock: 190, requiresPrescription: true, instructions: 'Take 1 tablet in the morning after breakfast.' },
  { name: 'Amlong 5', genericName: 'Amlodipine 5mg', category: 'Cardiovascular', strength: '5mg', dosageForm: 'Tablet', manufacturer: 'Micro Labs Ltd', price: 38.00, schedule: 'Schedule H', stock: 280, requiresPrescription: true, instructions: 'Take 1 tablet once daily with water.' },
  { name: 'Atorva 10', genericName: 'Atorvastatin 10mg', category: 'Cardiovascular', strength: '10mg', dosageForm: 'Tablet', manufacturer: 'Zydus Cadila', price: 98.00, schedule: 'Schedule H', stock: 260, requiresPrescription: true, instructions: 'Take 1 tablet at night before bed.' },
  { name: 'Rosuvas 10', genericName: 'Rosuvastatin 10mg', category: 'Cardiovascular', strength: '10mg', dosageForm: 'Tablet', manufacturer: 'Sun Pharma', price: 145.00, schedule: 'Schedule H', stock: 170, requiresPrescription: true, instructions: 'Take 1 tablet at bedtime.' },
  { name: 'Concor 5', genericName: 'Bisoprolol 5mg', category: 'Cardiovascular', strength: '5mg', dosageForm: 'Tablet', manufacturer: 'Merck Ltd', price: 95.00, schedule: 'Schedule H', stock: 130, requiresPrescription: true, instructions: 'Take 1 tablet in morning with water.' },
  { name: 'Ecosprin 75', genericName: 'Aspirin 75mg', category: 'Cardiovascular', strength: '75mg', dosageForm: 'Capsule', manufacturer: 'USV Pvt Ltd', price: 5.80, schedule: 'Schedule H', stock: 500, requiresPrescription: true, instructions: 'Take 1 capsule post-lunch daily.' },
  { name: 'Pan 40', genericName: 'Pantoprazole 40mg', category: 'Gastrointestinal', strength: '40mg', dosageForm: 'Tablet', manufacturer: 'Alkem Laboratories', price: 110.00, schedule: 'Schedule H', stock: 350, requiresPrescription: true, instructions: 'Take 1 tablet early morning 30 minutes before breakfast.' },
  { name: 'Pan D', genericName: 'Pantoprazole 40mg + Domperidone 30mg', category: 'Gastrointestinal', strength: '40mg+30mg', dosageForm: 'Capsule', manufacturer: 'Alkem Laboratories', price: 165.00, schedule: 'Schedule H', stock: 290, requiresPrescription: true, instructions: 'Take 1 capsule empty stomach in morning.' },
  { name: 'Omez 20', genericName: 'Omeprazole 20mg', category: 'Gastrointestinal', strength: '20mg', dosageForm: 'Capsule', manufacturer: 'Dr. Reddy Labs', price: 58.00, schedule: 'OTC', stock: 310, requiresPrescription: false, instructions: 'Take 1 capsule before morning food.' },
  { name: 'Rantac 150', genericName: 'Ranitidine 150mg', category: 'Gastrointestinal', strength: '150mg', dosageForm: 'Tablet', manufacturer: 'J.B. Chemicals', price: 28.50, schedule: 'OTC', stock: 180, requiresPrescription: false, instructions: 'Take 1 tablet before meal as needed.' },
  { name: 'Gelusil MPS', genericName: 'Aluminium Hydroxide + Magnesium Hydroxide + Simethicone', category: 'Gastrointestinal', strength: 'Liquid', dosageForm: 'Syrup', manufacturer: 'Pfizer India', price: 115.00, schedule: 'OTC', stock: 150, requiresPrescription: false, instructions: 'Take 2 teaspoons after meals and at bedtime.' },
  { name: 'Augmentin 625 Duo', genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg', category: 'Antibiotics', strength: '625mg', dosageForm: 'Tablet', manufacturer: 'GSK', price: 195.00, schedule: 'Schedule H', stock: 220, requiresPrescription: true, instructions: 'Take 1 tablet every 12 hours after full meal for 5 days.' },
  { name: 'Azithral 500', genericName: 'Azithromycin 500mg', category: 'Antibiotics', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Alembic Pharmaceuticals', price: 125.00, schedule: 'Schedule H', stock: 200, requiresPrescription: true, instructions: 'Take 1 tablet once daily 1 hour before or 2 hours after meals.' },
  { name: 'Cifran 500', genericName: 'Ciprofloxacin 500mg', category: 'Antibiotics', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Sun Pharma', price: 45.00, schedule: 'Schedule H', stock: 160, requiresPrescription: true, instructions: 'Take 1 tablet twice daily with abundant water.' },
  { name: 'Taxim O 200', genericName: 'Cefixime 200mg', category: 'Antibiotics', strength: '200mg', dosageForm: 'Tablet', manufacturer: 'Alkem Laboratories', price: 110.00, schedule: 'Schedule H', stock: 180, requiresPrescription: true, instructions: 'Take 1 tablet twice daily with food.' },
  { name: 'Allegra 120', genericName: 'Fexofenadine 120mg', category: 'Respiratory & Allergy', strength: '120mg', dosageForm: 'Tablet', manufacturer: 'Sanofi India', price: 160.00, schedule: 'Schedule H', stock: 190, requiresPrescription: true, instructions: 'Take 1 tablet daily with water.' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine Dihydrochloride 10mg', category: 'Respiratory & Allergy', strength: '10mg', dosageForm: 'Tablet', manufacturer: 'Cipla Ltd', price: 18.00, schedule: 'OTC', stock: 400, requiresPrescription: false, instructions: 'Take 1 tablet at night before bed.' },
  { name: 'Montair LC', genericName: 'Montelukast 10mg + Levocetirizine 5mg', category: 'Respiratory & Allergy', strength: '10mg+5mg', dosageForm: 'Tablet', manufacturer: 'Cipla Ltd', price: 180.00, schedule: 'Schedule H', stock: 210, requiresPrescription: true, instructions: 'Take 1 tablet at bedtime.' },
  { name: 'Ascoril D Plus', genericName: 'Dextromethorphan + Phenylephrine + Chlorpheniramine', category: 'Respiratory & Allergy', strength: 'Syrup 100ml', dosageForm: 'Syrup', manufacturer: 'Glenmark Pharmaceuticals', price: 118.00, schedule: 'OTC', stock: 130, requiresPrescription: false, instructions: 'Take 1-2 teaspoons thrice daily.' },
  { name: 'Asthalin 100mcg Inhaler', genericName: 'Salbutamol 100mcg', category: 'Respiratory & Allergy', strength: '100mcg', dosageForm: 'Inhaler', manufacturer: 'Cipla Ltd', price: 142.00, schedule: 'Schedule H', stock: 85, requiresPrescription: true, instructions: '1-2 puffs as needed for acute shortness of breath.' },
  { name: 'Becosules Z', genericName: 'Vitamin B Complex + Vitamin C + Zinc', category: 'Vitamins & Supplements', strength: 'Capsule', dosageForm: 'Capsule', manufacturer: 'Pfizer India', price: 42.00, schedule: 'OTC', stock: 500, requiresPrescription: false, instructions: 'Take 1 capsule daily after lunch.' },
  { name: 'Shelcal 500', genericName: 'Calcium 500mg + Vitamin D3 250 IU', category: 'Vitamins & Supplements', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Torrent Pharma', price: 120.00, schedule: 'OTC', stock: 360, requiresPrescription: false, instructions: 'Take 1 tablet daily after breakfast.' },
  { name: 'Uprise D3 60K', genericName: 'Cholecalciferol (Vitamin D3) 60,000 IU', category: 'Vitamins & Supplements', strength: '60000 IU', dosageForm: 'Capsule', manufacturer: 'Alkem Laboratories', price: 180.00, schedule: 'OTC', stock: 240, requiresPrescription: false, instructions: 'Take 1 capsule once weekly with milk for 8 weeks.' },
  { name: 'Neurobion Forte', genericName: 'Vitamin B1 + B2 + B3 + B5 + B6 + B12', category: 'Vitamins & Supplements', strength: 'Tablet', dosageForm: 'Tablet', manufacturer: 'Procter & Gamble Health', price: 38.00, schedule: 'OTC', stock: 450, requiresPrescription: false, instructions: 'Take 1 tablet daily after food.' },
  { name: 'Evion 400', genericName: 'Vitamin E 400mg', category: 'Vitamins & Supplements', strength: '400mg', dosageForm: 'Capsule', manufacturer: 'Merck Ltd', price: 35.00, schedule: 'OTC', stock: 300, requiresPrescription: false, instructions: 'Take 1 capsule daily with food.' },
  { name: 'Thyronorm 50', genericName: 'Levothyroxine Sodium 50mcg', category: 'Endocrine', strength: '50mcg', dosageForm: 'Tablet', manufacturer: 'Abbott Healthcare', price: 135.00, schedule: 'Schedule H', stock: 310, requiresPrescription: true, instructions: 'Take 1 tablet daily on empty stomach 30 mins before morning tea.' },
  { name: 'Thyronorm 25', genericName: 'Levothyroxine Sodium 25mcg', category: 'Endocrine', strength: '25mcg', dosageForm: 'Tablet', manufacturer: 'Abbott Healthcare', price: 120.00, schedule: 'Schedule H', stock: 250, requiresPrescription: true, instructions: 'Take 1 tablet early morning before food.' },
  { name: 'Ciplox 500', genericName: 'Ciprofloxacin 500mg', category: 'Antibiotics', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Cipla Ltd', price: 42.50, schedule: 'Schedule H', stock: 190, requiresPrescription: true, instructions: 'Take 1 tablet twice daily after meals.' },
  { name: 'Zoryl M 2', genericName: 'Glimepiride 2mg + Metformin 500mg', category: 'Antidiabetic', strength: '2mg+500mg', dosageForm: 'Tablet', manufacturer: 'Intas Pharmaceuticals', price: 135.00, schedule: 'Schedule H', stock: 160, requiresPrescription: true, instructions: 'Take 1 tablet before breakfast.' },
  { name: 'Stamlo 5', genericName: 'Amlodipine 5mg', category: 'Cardiovascular', strength: '5mg', dosageForm: 'Tablet', manufacturer: 'Dr. Reddy Labs', price: 55.00, schedule: 'Schedule H', stock: 220, requiresPrescription: true, instructions: 'Take 1 tablet daily.' },
  { name: 'Losar 50', genericName: 'Losartan Potassium 50mg', category: 'Cardiovascular', strength: '50mg', dosageForm: 'Tablet', manufacturer: 'Unichem Labs', price: 89.00, schedule: 'Schedule H', stock: 180, requiresPrescription: true, instructions: 'Take 1 tablet once daily morning.' },
  { name: 'Cardivas 3.125', genericName: 'Carvedilol 3.125mg', category: 'Cardiovascular', strength: '3.125mg', dosageForm: 'Tablet', manufacturer: 'Sun Pharma', price: 48.00, schedule: 'Schedule H', stock: 120, requiresPrescription: true, instructions: 'Take 1 tablet with food twice daily.' },
  { name: 'Nexpro 40', genericName: 'Esomeprazole 40mg', category: 'Gastrointestinal', strength: '40mg', dosageForm: 'Tablet', manufacturer: 'Torrent Pharma', price: 140.00, schedule: 'Schedule H', stock: 175, requiresPrescription: true, instructions: 'Take 1 tablet empty stomach in the morning.' },
  { name: 'Digene Gel', genericName: 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone', category: 'Gastrointestinal', strength: 'Gel 200ml', dosageForm: 'Syrup', manufacturer: 'Abbott Healthcare', price: 132.00, schedule: 'OTC', stock: 220, requiresPrescription: false, instructions: 'Take 2-4 teaspoons after meals and at bedtime.' },
  { name: 'Cremaffin Syrup', genericName: 'Liquid Paraffin + Magnesium Hydroxide', category: 'Gastrointestinal', strength: 'Syrup 225ml', dosageForm: 'Syrup', manufacturer: 'Abbott Healthcare', price: 215.00, schedule: 'OTC', stock: 110, requiresPrescription: false, instructions: 'Take 1-2 tablespoons at bedtime with water.' },
  { name: 'Supradyn Daily', genericName: 'Multivitamins + Minerals + Trace Elements', category: 'Vitamins & Supplements', strength: 'Tablet', dosageForm: 'Tablet', manufacturer: 'Bayer Pharmaceuticals', price: 48.00, schedule: 'OTC', stock: 380, requiresPrescription: false, instructions: 'Take 1 tablet daily after lunch.' },
  { name: 'Limcee 500', genericName: 'Vitamin C (Ascorbic Acid) 500mg', category: 'Vitamins & Supplements', strength: '500mg', dosageForm: 'Chewable Tablet', manufacturer: 'Abbott Healthcare', price: 24.00, schedule: 'OTC', stock: 420, requiresPrescription: false, instructions: 'Chew 1 tablet daily.' },
  { name: 'Zincovit', genericName: 'Multivitamin + Multimineral + Zinc', category: 'Vitamins & Supplements', strength: 'Tablet', dosageForm: 'Tablet', manufacturer: 'Apex Laboratories', price: 105.00, schedule: 'OTC', stock: 350, requiresPrescription: false, instructions: 'Take 1 tablet after meals once daily.' },
  { name: 'Volini Gel', genericName: 'Diclofenac Diethylamine + Linseed Oil + Methyl Salicylate + Menthol', category: 'Analgesics & Antipyretics', strength: 'Gel 30g', dosageForm: 'Gel', manufacturer: 'Sun Pharma', price: 125.00, schedule: 'OTC', stock: 250, requiresPrescription: false, instructions: 'Apply gently on affected joint/muscle 3-4 times daily.' },
  { name: 'Moov Pain Relief', genericName: 'Wintergreen Oil + Nilgiri Oil + Pudinah Ka Phool', category: 'Analgesics & Antipyretics', strength: 'Ointment 50g', dosageForm: 'Ointment', manufacturer: 'Reckitt Benckiser', price: 180.00, schedule: 'OTC', stock: 280, requiresPrescription: false, instructions: 'Massage lightly over painful area.' },
  { name: 'Liv 52 DS', genericName: 'Herbal Liver Health Complex', category: 'Gastrointestinal', strength: 'Tablet', dosageForm: 'Tablet', manufacturer: 'Himalaya Wellness', price: 165.00, schedule: 'OTC', stock: 310, requiresPrescription: false, instructions: 'Take 1 tablet twice daily before meals.' },
];

function generateUUID() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

class LocalDatabase {
  constructor(options = {}) {
    this.options = options;
    this.storagePath = options.storagePath || null;
    this.inMemory = options.inMemory !== undefined ? options.inMemory : !options.storagePath;
    this.lastPulledAt = 0;
    this.isInitialized = false;

    // In-memory data store for tables
    this.data = {
      [TABLES.MEDICINES]: new Map(),
      [TABLES.PRESCRIPTIONS]: new Map(),
      [TABLES.REMINDERS]: new Map(),
      [TABLES.SYNC_QUEUE]: new Map(),
    };

    // Indices: table -> indexName -> value -> Set(id)
    this.indices = {
      [TABLES.MEDICINES]: {
        name: new Map(),
        generic_name: new Map(),
        category: new Map(),
        sync_status: new Map(),
      },
      [TABLES.PRESCRIPTIONS]: {
        patient_id: new Map(),
        status: new Map(),
        sync_status: new Map(),
      },
      [TABLES.REMINDERS]: {
        prescription_id: new Map(),
        user_id: new Map(),
        status: new Map(),
        sync_status: new Map(),
      },
      [TABLES.SYNC_QUEUE]: {
        table_name: new Map(),
        record_id: new Map(),
        status: new Map(),
      },
    };
  }

  /**
   * Initialize database and load persisted state or pre-seed catalog.
   */
  async init() {
    if (this.storagePath && fs.existsSync(this.storagePath)) {
      try {
        const fileContent = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.lastPulledAt) {
          this.lastPulledAt = parsed.lastPulledAt;
        }
        if (parsed.tables) {
          for (const tableName of Object.values(TABLES)) {
            if (parsed.tables[tableName]) {
              for (const record of parsed.tables[tableName]) {
                this.insertMemory(tableName, record);
              }
            }
          }
        }
      } catch (e) {
        // If file read fails, continue fresh
      }
    }

    // Automatically pre-seed medicine catalog if empty
    if (this.data[TABLES.MEDICINES].size === 0) {
      await this.preSeedCatalog();
    }

    this.isInitialized = true;
    return this;
  }

  /**
   * Pre-seed medicine catalog from server seed file or embedded list.
   */
  async preSeedCatalog() {
    let sourceSeeds = [];

    // 1. Try reading server seed file if running in local monorepo
    const serverSeedPath = path.join(__dirname, '../../../../server/src/seeds/medicines.seed.json');
    try {
      if (fs.existsSync(serverSeedPath)) {
        sourceSeeds = JSON.parse(fs.readFileSync(serverSeedPath, 'utf8'));
      }
    } catch (e) {
      // Fallback
    }

    // 2. If not found or empty, use embedded 50+ seeds
    if (!sourceSeeds || sourceSeeds.length === 0) {
      sourceSeeds = EMBEDDED_SEED_MEDICINES;
    }

    // Insert seeds
    for (let i = 0; i < sourceSeeds.length; i++) {
      const s = sourceSeeds[i];
      const recordId = s.id || `med_seed_${i + 1}`;
      const record = {
        id: recordId,
        name: s.name,
        generic_name: s.genericName || s.generic_name || s.name,
        category: s.category || 'General',
        dosage: s.strength || s.dosage || '',
        form: s.dosageForm || s.form || 'Tablet',
        manufacturer: s.manufacturer || 'Generic Pharma',
        price: typeof s.price === 'number' ? s.price : 50.0,
        stock: typeof s.stock === 'number' ? s.stock : 100,
        schedule: s.schedule || (s.requiresPrescription ? 'Schedule H' : 'OTC'),
        side_effects: s.sideEffects || s.side_effects || [],
        instructions: s.instructions || '',
        requires_prescription: s.requiresPrescription !== undefined ? s.requiresPrescription : (s.schedule === 'Schedule H'),
        sync_status: SYNC_STATUS.SYNCED,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      this.insertMemory(TABLES.MEDICINES, record);
    }

    this.persist();
  }

  /**
   * Internal helper to insert record into memory and update indices.
   */
  insertMemory(tableName, record) {
    if (!this.data[tableName]) {
      this.data[tableName] = new Map();
    }
    this.data[tableName].set(record.id, record);

    // Index updates
    const tableIndices = this.indices[tableName];
    if (tableIndices) {
      for (const [col, indexMap] of Object.entries(tableIndices)) {
        const val = record[col];
        if (val !== undefined && val !== null) {
          const key = String(val).toLowerCase();
          if (!indexMap.has(key)) {
            indexMap.set(key, new Set());
          }
          indexMap.get(key).add(record.id);
        }
      }
    }
  }

  /**
   * Internal helper to remove record from index.
   */
  removeFromIndex(tableName, record) {
    const tableIndices = this.indices[tableName];
    if (!tableIndices || !record) return;

    for (const [col, indexMap] of Object.entries(tableIndices)) {
      const val = record[col];
      if (val !== undefined && val !== null) {
        const key = String(val).toLowerCase();
        if (indexMap.has(key)) {
          indexMap.get(key).delete(record.id);
        }
      }
    }
  }

  /**
   * Save database state to disk if storagePath is configured.
   */
  persist() {
    if (this.inMemory || !this.storagePath) return;

    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dump = {
        lastPulledAt: this.lastPulledAt,
        timestamp: Date.now(),
        tables: {},
      };

      for (const tableName of Object.values(TABLES)) {
        dump.tables[tableName] = Array.from(this.data[tableName].values());
      }

      fs.writeFileSync(this.storagePath, JSON.stringify(dump, null, 2), 'utf8');
    } catch (e) {
      // Ignore write errors in restricted sandboxes
    }
  }

  /**
   * Insert a record into a table.
   */
  async insert(tableName, recordData) {
    if (!TABLES[tableName.toUpperCase()] && !this.data[tableName]) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    const id = recordData.id || generateUUID();
    const now = Date.now();
    const record = {
      ...recordData,
      id,
      created_at: recordData.created_at || now,
      updated_at: recordData.updated_at || now,
      sync_status: recordData.sync_status || (tableName === TABLES.MEDICINES ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING_CREATE),
    };

    this.insertMemory(tableName, record);
    this.persist();
    return { ...record };
  }

  /**
   * Update a record by ID.
   */
  async update(tableName, id, updates) {
    const table = this.data[tableName];
    if (!table || !table.has(id)) {
      return null;
    }

    const existing = table.get(id);
    this.removeFromIndex(tableName, existing);

    const updatedRecord = {
      ...existing,
      ...updates,
      id, // Preserve immutable ID
      updated_at: updates.updated_at || Date.now(),
      sync_status: updates.sync_status || (existing.sync_status === SYNC_STATUS.PENDING_CREATE ? SYNC_STATUS.PENDING_CREATE : SYNC_STATUS.PENDING_UPDATE),
    };

    this.insertMemory(tableName, updatedRecord);
    this.persist();
    return { ...updatedRecord };
  }

  /**
   * Delete a record by ID.
   */
  async delete(tableName, id) {
    const table = this.data[tableName];
    if (!table || !table.has(id)) {
      return false;
    }

    const existing = table.get(id);
    this.removeFromIndex(tableName, existing);
    table.delete(id);
    this.persist();
    return true;
  }

  /**
   * Find a record by its primary key.
   */
  async findById(tableName, id) {
    const table = this.data[tableName];
    if (!table || !table.has(id)) return null;
    return { ...table.get(id) };
  }

  /**
   * Find all records matching a filter predicate or key-value object.
   */
  async find(tableName, filter) {
    const table = this.data[tableName];
    if (!table) return [];

    const allRecords = Array.from(table.values());
    if (!filter) return allRecords.map((r) => ({ ...r }));

    if (typeof filter === 'function') {
      return allRecords.filter(filter).map((r) => ({ ...r }));
    }

    return allRecords
      .filter((record) => {
        for (const [key, val] of Object.entries(filter)) {
          if (record[key] !== val) return false;
        }
        return true;
      })
      .map((r) => ({ ...r }));
  }

  /**
   * Return all records from a table.
   */
  async all(tableName) {
    return this.find(tableName);
  }

  /**
   * Count records in a table matching an optional filter.
   */
  async count(tableName, filter) {
    const results = await this.find(tableName, filter);
    return results.length;
  }

  /**
   * Transaction support: atomic execution with snapshot rollback on error.
   */
  async transaction(fn) {
    // Deep clone state snapshot
    const snapshot = {};
    for (const [tableName, map] of Object.entries(this.data)) {
      snapshot[tableName] = new Map();
      for (const [id, rec] of map.entries()) {
        snapshot[tableName].set(id, JSON.parse(JSON.stringify(rec)));
      }
    }

    try {
      const result = await fn(this);
      this.persist();
      return result;
    } catch (err) {
      // Rollback to snapshot
      this.data = snapshot;
      throw err;
    }
  }

  /**
   * Offline Catalog Search with generic name matching, fuzzy/partial matching,
   * price indicator, and schedule warnings.
   */
  async searchMedicines(query, options = {}) {
    const table = this.data[TABLES.MEDICINES];
    if (!table) return [];

    const allMeds = Array.from(table.values());
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      const limit = options.limit || 20;
      return allMeds.slice(0, limit).map((m) => ({ ...m }));
    }

    const cleanQuery = query.toLowerCase().trim();
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    const scored = [];

    for (const med of allMeds) {
      const name = (med.name || '').toLowerCase();
      const generic = (med.generic_name || '').toLowerCase();
      const category = (med.category || '').toLowerCase();

      let score = 0;

      // Exact matches (highest priority)
      if (name === cleanQuery) score += 100;
      else if (generic === cleanQuery) score += 90;

      // Prefix matches
      else if (name.startsWith(cleanQuery)) score += 60;
      else if (generic.startsWith(cleanQuery)) score += 50;

      // Substring matches
      else if (name.includes(cleanQuery)) score += 35;
      else if (generic.includes(cleanQuery)) score += 30;
      else if (category.includes(cleanQuery)) score += 15;

      // Token-level matches
      for (const token of tokens) {
        if (name.includes(token)) score += 10;
        if (generic.includes(token)) score += 8;
        if (category.includes(token)) score += 4;
      }

      if (score > 0) {
        scored.push({
          med: { ...med },
          score,
        });
      }
    }

    // Sort by relevance score descending, then by name ascending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.med.name.localeCompare(b.med.name);
    });

    const limit = options.limit || 50;
    return scored.slice(0, limit).map((s) => s.med);
  }

  /**
   * Enqueue a pending mutation into sync_queue.
   */
  async enqueueSync(tableName, recordId, action, payload = {}) {
    const queueItem = {
      id: generateUUID(),
      table_name: tableName,
      record_id: recordId,
      action, // 'create', 'update', 'delete'
      payload,
      status: SYNC_QUEUE_STATUS.PENDING,
      retry_count: 0,
      error: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    return this.insert(TABLES.SYNC_QUEUE, queueItem);
  }

  /**
   * Fetch all pending mutations from the sync queue.
   */
  async getPendingSync() {
    return this.find(TABLES.SYNC_QUEUE, (item) => item.status === SYNC_QUEUE_STATUS.PENDING);
  }

  /**
   * Mark a queued sync mutation as synced and update target record status.
   */
  async markSyncCompleted(queueId, recordId) {
    await this.update(TABLES.SYNC_QUEUE, queueId, {
      status: SYNC_QUEUE_STATUS.SYNCED,
      updated_at: Date.now(),
    });

    // If record exists in its table, mark synced
    const queueItem = await this.findById(TABLES.SYNC_QUEUE, queueId);
    if (queueItem && queueItem.table_name && this.data[queueItem.table_name]) {
      const targetTable = queueItem.table_name;
      const rec = await this.findById(targetTable, recordId);
      if (rec) {
        await this.update(targetTable, recordId, {
          sync_status: SYNC_STATUS.SYNCED,
          updated_at: Date.now(),
        });
      }
    }
  }

  /**
   * Mark a queued sync mutation as failed.
   */
  async markSyncFailed(queueId, error) {
    const item = await this.findById(TABLES.SYNC_QUEUE, queueId);
    if (!item) return;

    const retryCount = (item.retry_count || 0) + 1;
    await this.update(TABLES.SYNC_QUEUE, queueId, {
      status: retryCount >= 5 ? SYNC_QUEUE_STATUS.FAILED : SYNC_QUEUE_STATUS.PENDING,
      retry_count: retryCount,
      error: String(error),
      updated_at: Date.now(),
    });
  }

  /**
   * Get / Set lastPulledAt sync timestamp.
   */
  getLastPulledAt() {
    return this.lastPulledAt;
  }

  setLastPulledAt(timestamp) {
    this.lastPulledAt = Number(timestamp) || 0;
    this.persist();
  }

  /**
   * Clear database (for testing).
   */
  async clear() {
    for (const tableName of Object.values(TABLES)) {
      this.data[tableName].clear();
      const tableIndices = this.indices[tableName];
      if (tableIndices) {
        for (const indexMap of Object.values(tableIndices)) {
          indexMap.clear();
        }
      }
    }
    this.lastPulledAt = 0;
    this.persist();
  }
}

// Default singleton instance
const defaultDb = new LocalDatabase({ inMemory: true });

module.exports = {
  LocalDatabase,
  db: defaultDb,
  TABLES,
  SYNC_STATUS,
  SYNC_QUEUE_STATUS,
};
