/**
 * Quick Sanjeevani — WhatsApp Bot Intent, OCR, Voice & Dispatch Unit & Integration Tests
 * Validates Two-Tier Intent Recognition, OCR Parsing, ElevenLabs TTS Synthesis,
 * Elder Templates, and Twilio Outbound Dispatching.
 */

const intentService = require('../src/services/intentService');
const ocrService = require('../src/services/ocrService');
const ttsService = require('../src/services/ttsService');
const twilioService = require('../src/services/twilioService');
const templates = require('../src/templates/messages');
const webhook = require('../src/webhook');

describe('Two-Tier Intent Recognition Engine (intentService)', () => {
  describe('Tier 1: Greetings', () => {
    test('Matches English greetings (hi, hello, hey)', async () => {
      const res1 = await intentService.detectIntent('Hi');
      expect(res1.intent).toBe('GREETING');
      expect(res1.tier).toBe(1);

      const res2 = await intentService.detectIntent('Hello');
      expect(res2.intent).toBe('GREETING');

      const res3 = await intentService.detectIntent('Good morning');
      expect(res3.intent).toBe('GREETING');
    });

    test('Matches Hindi & transliterated greetings (Namaste, Pranam, Salaam)', async () => {
      const res1 = await intentService.detectIntent('Namaste');
      expect(res1.intent).toBe('GREETING');
      expect(res1.language).toBe('hi');

      const res2 = await intentService.detectIntent('Pranam');
      expect(res2.intent).toBe('GREETING');
      expect(res2.language).toBe('hi');

      const res3 = await intentService.detectIntent('नमस्ते');
      expect(res3.intent).toBe('GREETING');
      expect(res3.language).toBe('hi');
    });

    test('Matches Kannada & South Indian greetings (Namaskara, Vanakkam)', async () => {
      const res1 = await intentService.detectIntent('Namaskara');
      expect(res1.intent).toBe('GREETING');
      expect(res1.language).toBe('kn');

      const res2 = await intentService.detectIntent('Vanakkam');
      expect(res2.intent).toBe('GREETING');

      const res3 = await intentService.detectIntent('ನಮಸ್ಕಾರ');
      expect(res3.intent).toBe('GREETING');
      expect(res3.language).toBe('kn');
    });
  });

  describe('Tier 1: Medicine Search Extraction', () => {
    test('Extracts medicine from numbered shortcut ("1 Paracetamol")', async () => {
      const res = await intentService.detectIntent('1 Paracetamol');
      expect(res.intent).toBe('MEDICINE_SEARCH');
      expect(res.entities.medicine.toLowerCase()).toContain('paracetamol');
    });

    test('Extracts medicine with keyword prefix ("search Metformin", "dawai Dolo")', async () => {
      const res1 = await intentService.detectIntent('search Metformin');
      expect(res1.intent).toBe('MEDICINE_SEARCH');
      expect(res1.entities.medicine.toLowerCase()).toContain('metformin');

      const res2 = await intentService.detectIntent('dawai Dolo 650');
      expect(res2.intent).toBe('MEDICINE_SEARCH');
      expect(res2.entities.medicine.toLowerCase()).toContain('dolo');
    });

    test('Extracts medicine from colloquial Hindi ("दवाई चाहिए Paracetamol")', async () => {
      const res = await intentService.detectIntent('दवाई चाहिए Paracetamol');
      expect(res.intent).toBe('MEDICINE_SEARCH');
      expect(res.entities.medicine).toBe('Paracetamol');
      expect(res.language).toBe('hi');
    });

    test('extractMedicineQuery strips colloquial prefix cleanly and matches catalog', async () => {
      const extracted = intentService.extractMedicineQuery('दवाई चाहिए Metformin');
      expect(extracted).toBe('Metformin');
      const catalogItem = webhook.searchCatalog(extracted);
      expect(catalogItem).toBeTruthy();
      expect(catalogItem.name).toContain('Metformin 500mg');
    });

    test('Identifies standalone common Indian medicines (Amlodipine, Atorvastatin)', async () => {
      const res = await intentService.detectIntent('Amlodipine');
      expect(res.intent).toBe('MEDICINE_SEARCH');
      expect(res.entities.medicine.toLowerCase()).toBe('amlodipine');
    });
  });

  describe('Tier 1: Reminders, Pharmacy, Help & Emergency', () => {
    test('Extracts reminder intent ("2 Reminder", "dawai ka time", "schedule")', async () => {
      const res1 = await intentService.detectIntent('2 Reminder');
      expect(res1.intent).toBe('REMINDERS');

      const res2 = await intentService.detectIntent('dawai ka time');
      expect(res2.intent).toBe('REMINDERS');
      expect(res2.language).toBe('hi');

      const res3 = await intentService.detectIntent('pills time');
      expect(res3.intent).toBe('REMINDERS');
    });

    test('Matches Devanagari and Kannada reminder queries ("दवाई का समय", "ವೇಳಾಪಟ್ಟಿ")', async () => {
      const res1 = await intentService.detectIntent('दवाई का समय');
      expect(res1.intent).toBe('REMINDERS');
      expect(res1.language).toBe('hi');

      const res2 = await intentService.detectIntent('ವೇಳಾಪಟ್ಟಿ');
      expect(res2.intent).toBe('REMINDERS');
      expect(res2.language).toBe('kn');
    });

    test('Extracts pharmacy discovery intent ("3 Pharmacy", "medical shop", "chemist")', async () => {
      const res1 = await intentService.detectIntent('3 Pharmacy');
      expect(res1.intent).toBe('PHARMACY');

      const res2 = await intentService.detectIntent('medical shop near me');
      expect(res2.intent).toBe('PHARMACY');

      const res3 = await intentService.detectIntent('dawa ki dukan');
      expect(res3.intent).toBe('PHARMACY');
      expect(res3.language).toBe('hi');
    });

    test('Matches Devanagari and Kannada pharmacy queries ("दवा की दुकान", "ಔಷಧಾಲಯ")', async () => {
      const res1 = await intentService.detectIntent('दवा की दुकान');
      expect(res1.intent).toBe('PHARMACY');
      expect(res1.language).toBe('hi');

      const res2 = await intentService.detectIntent('ಔಷಧಾಲಯ');
      expect(res2.intent).toBe('PHARMACY');
      expect(res2.language).toBe('kn');
    });

    test('Extracts help and menu intent ("help", "menu", "madad", "5")', async () => {
      const res1 = await intentService.detectIntent('help');
      expect(res1.intent).toBe('HELP');

      const res2 = await intentService.detectIntent('madad');
      expect(res2.intent).toBe('HELP');
      expect(res2.language).toBe('hi');

      const res3 = await intentService.detectIntent('5');
      expect(res3.intent).toBe('HELP');
    });

    test('Matches Devanagari and Kannada help queries ("मदद", "ಸಹಾಯ")', async () => {
      const res1 = await intentService.detectIntent('मदद');
      expect(res1.intent).toBe('HELP');
      expect(res1.language).toBe('hi');

      const res2 = await intentService.detectIntent('ಸಹಾಯ');
      expect(res2.intent).toBe('HELP');
      expect(res2.language).toBe('kn');
    });

    test('Extracts emergency intent ("emergency", "sos", "heart attack", "chhati me dard")', async () => {
      const res1 = await intentService.detectIntent('emergency');
      expect(res1.intent).toBe('EMERGENCY');
      expect(res1.confidence).toBe(1.0);

      const res2 = await intentService.detectIntent('chhati me dard');
      expect(res2.intent).toBe('EMERGENCY');
      expect(res2.language).toBe('hi');

      const res3 = await intentService.detectIntent('ambulance');
      expect(res3.intent).toBe('EMERGENCY');
    });

    test('Matches Devanagari and Kannada emergency queries ("सीने में दर्द", "ತುರ್ತು")', async () => {
      const res1 = await intentService.detectIntent('सीने में दर्द');
      expect(res1.intent).toBe('EMERGENCY');
      expect(res1.confidence).toBe(1.0);
      expect(res1.language).toBe('hi');

      const res2 = await intentService.detectIntent('ತುರ್ತು');
      expect(res2.intent).toBe('EMERGENCY');
      expect(res2.confidence).toBe(1.0);
      expect(res2.language).toBe('kn');
    });
  });

  describe('Tier 2: Fallback Handling', () => {
    test('Returns UNKNOWN with elderly friendly fallback when query is unrecognized and no API key', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const res = await intentService.detectIntent('Random conversation xyz123');
      expect(res.intent).toBe('UNKNOWN');
      expect(res.confidence).toBe(0.0);

      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});

describe('Prescription OCR Parsing Service (ocrService)', () => {
  test('Extracts structured medications from sample prescription payload', async () => {
    const rx = await ocrService.processPrescription({
      mediaUrl: 'https://example.com/rx_sample.jpg',
      mediaContentType: 'image/jpeg'
    });

    expect(rx.success).toBe(true);
    expect(rx.patientName).toBe('Rameshwaridevi');
    expect(rx.doctorName).toContain('Dr. R. K. Sharma');
    expect(Array.isArray(rx.extractedMedicines)).toBe(true);
    expect(rx.extractedMedicines.length).toBeGreaterThanOrEqual(1);

    const firstMed = rx.extractedMedicines[0];
    expect(firstMed.name).toBe('Metformin');
    expect(firstMed.strength).toBe('500mg');
  });

  test('Validates confidence score bounds [0.0 - 1.0]', async () => {
    const rx = await ocrService.processPrescription({
      mediaUrl: 'https://example.com/default.jpg'
    });

    expect(rx.confidence).toBeGreaterThanOrEqual(0.0);
    expect(rx.confidence).toBeLessThanOrEqual(1.0);
  });

  test('Fallback parsing provides default prescription structure on arbitrary image URLs', async () => {
    const rx = await ocrService.processPrescription({
      mediaUrl: 'https://res.cloudinary.com/custom_upload.jpg'
    });

    expect(rx.success).toBe(true);
    expect(rx.extractedMedicines.length).toBeGreaterThanOrEqual(1);
    expect(rx.imageUrl).toBe('https://res.cloudinary.com/custom_upload.jpg');
  });
});

describe('Regional Voice Synthesis Service (ttsService)', () => {
  test('Selects appropriate Voice ID for Hindi and Kannada', () => {
    const hindiVoice = ttsService.getVoiceIdForLanguage('hi');
    const kannadaVoice = ttsService.getVoiceIdForLanguage('kn');
    const englishVoice = ttsService.getVoiceIdForLanguage('en');

    expect(hindiVoice).toBeTruthy();
    expect(kannadaVoice).toBeTruthy();
    expect(englishVoice).toBeTruthy();
  });

  test('Generates audio link and mock buffer when ElevenLabs API key is absent/offline', async () => {
    const res = await ttsService.generateVoiceNote({
      text: 'Namaste, aapki dawai ka samay ho gaya hai.',
      language: 'hi'
    });

    expect(res.success).toBe(true);
    expect(res.audioUrl).toContain('mock_voice_hi');
    expect(res.fallback).toBe(true);
    expect(Buffer.isBuffer(res.audioBuffer)).toBe(true);
  });

  test('Handles empty text input gracefully without crashing', async () => {
    const res = await ttsService.generateVoiceNote({ text: '' });
    expect(res.success).toBe(false);
    expect(res.audioUrl).toBeNull();
  });

  test('Defensively coerces non-string numeric or object input without throwing TypeError', async () => {
    const numRes = await ttsService.generateVoiceNote({ text: 12345 });
    expect(numRes.success).toBe(true);
    expect(numRes.audioUrl).toBeTruthy();

    const nullRes = await ttsService.generateVoiceNote({ text: null });
    expect(nullRes.success).toBe(false);
    expect(nullRes.audioUrl).toBeNull();
  });
});

describe('Twilio Outbound Dispatcher (twilioService)', () => {
  beforeEach(() => {
    twilioService.clearSentMessages();
  });

  test('Dispatches outbound message in mock mode with queued status and mock SID', async () => {
    const record = await twilioService.sendMessage({
      to: '+919876543210',
      body: 'Test message body'
    });

    expect(record.sid).toContain('mock_sid');
    expect(record.status).toBe('queued');
    expect(record.to).toBe('whatsapp:+919876543210');
    expect(record.from).toContain('whatsapp:');
    expect(record.body).toBe('Test message body');
  });

  test('Correctly attaches media URLs to outbound dispatch', async () => {
    const record = await twilioService.sendMessage({
      to: 'whatsapp:+919876543210',
      body: 'Voice reminder',
      mediaUrl: 'http://localhost:5001/audio/voice.mp3'
    });

    expect(record.mediaUrl).toEqual(['http://localhost:5001/audio/voice.mp3']);
  });

  test('Ledger records and clearSentMessages function as expected', async () => {
    await twilioService.sendMessage({ to: '+919876543210', body: 'Msg 1' });
    await twilioService.sendMessage({ to: '+919876543210', body: 'Msg 2' });

    expect(twilioService.getSentMessages().length).toBe(2);
    expect(twilioService.getLastSentMessage().body).toBe('Msg 2');

    twilioService.clearSentMessages();
    expect(twilioService.getSentMessages().length).toBe(0);
  });
});

describe('Elder-Friendly Conversational Templates (messages)', () => {
  test('Welcome template renders numbered options in Hindi and Kannada', () => {
    const hi = templates.welcome('hi');
    expect(hi).toContain('नमस्ते');
    expect(hi).toContain('1️⃣');
    expect(hi).toContain('2️⃣');
    expect(hi).toContain('3️⃣');

    const kn = templates.welcome('kn');
    expect(kn).toContain('ನಮಸ್ಕಾರ');
    expect(kn).toContain('1️⃣');
  });

  test('Medicine search result formats price, instructions, and precautions', () => {
    const med = {
      name: 'Dolo 650',
      genericName: 'Paracetamol 650mg',
      price: 34.50,
      instructions: 'Take after food',
      sideEffects: ['Nausea']
    };

    const res = templates.medicineSearchResult(med, 'en');
    expect(res).toContain('Dolo 650');
    expect(res).toContain('₹34.50');
    expect(res).toContain('Take after food');
  });

  test('Emergency alert includes Indian national emergency helpline numbers (108, 112)', () => {
    const emergency = templates.emergencyAlert('en');
    expect(emergency).toContain('108');
    expect(emergency).toContain('112');
    expect(emergency).toContain('14567');
  });
});
