/**
 * Quick Sanjeevani — Two-Tier Intent Recognition Engine
 * Tier 1: Deterministic regex and keyword matching (<5ms, zero external dependencies).
 * Tier 2: Natural Language & LLM Fallback (Google Gemini 2.0 Flash) for colloquial Hinglish/Kanglish.
 */

let axios;
try {
  axios = require('axios');
} catch {
  axios = require('../utils/httpClient');
}

// Supported Intent Constants
const INTENTS = {
  GREETING: 'GREETING',
  MEDICINE_SEARCH: 'MEDICINE_SEARCH',
  REMINDERS: 'REMINDERS',
  PHARMACY: 'PHARMACY',
  PRESCRIPTION_UPLOAD: 'PRESCRIPTION_UPLOAD',
  HELP: 'HELP',
  EMERGENCY: 'EMERGENCY',
  VOICE_REQUEST: 'VOICE_REQUEST',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Detect language from text (Devanagari, Kannada, or transliteration heuristics)
 */
function detectLanguage(text = '') {
  if (!text) return 'en';
  // Devanagari Unicode range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }
  // Kannada Unicode range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn';
  }

  const lower = text.toLowerCase();
  // Hindi transliteration keywords
  if (/\b(namaste|pranam|dawai|dawa|chahiye|kya|kaise|dukan|parchi|madad|kahan|batao|aaj|samay|dard|chhati|seene|mujhe|mera|meri|kripya)\b/.test(lower)) {
    return 'hi';
  }
  // Kannada transliteration keywords
  if (/\b(namaskara|namaskaram|aushadhi|beku|hegiddira|yelli|sigutte|thilisi|samaya)\b/.test(lower)) {
    return 'kn';
  }

  return 'en';
}

/**
 * Clean and extract medicine name from search query
 */
function extractMedicineQuery(text = '') {
  let cleaned = text.trim();

  // Strip leading numbering shortcut: "1 Paracetamol" -> "Paracetamol"
  cleaned = cleaned.replace(/^1[\s.:\-)#]*/i, '').trim();

  // Strip prefixes like "search", "find", "dawai", "medicine", "tablets", "दवाई चाहिए", "chahiye"
  cleaned = cleaned.replace(/^(search|find|lookup|dawai|dawa|medicine|tablets|tablet|syrup|capsule|ಔಷಧಿ|औषಧಿ|दवाई|दवा)\s+/i, '');
  cleaned = cleaned.replace(/(दवाई\s+चाहिए|dawai\s+chahiye|chahiye|beku|chahiye\s+mujhe|चाहिए|ಬೇಕು|please)\s*/gi, '').trim();
  cleaned = cleaned.replace(/^(for|about|of)\s+/i, '').trim();

  // Remove trailing punctuations
  cleaned = cleaned.replace(/[?!.]+$/, '').trim();

  return cleaned || text.trim();
}

/**
 * Tier 1: Fast Deterministic Regex & Keyword Matcher
 */
function matchTier1(text = '') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const lang = detectLanguage(trimmed);

  // 1. Emergency Intent (Highest Priority)
  const emergencyLatinRegex = /\b(emergency|sos|urgent|ambulance|heart attack|chest pain|chhati me dard|seene me dard|saans lene me takleef|behosh|unconscious|bleeding|108|112)\b/i;
  const emergencyIndicRegex = /(सीने में दर्द|छाती में दर्द|सांस लेने में तकलीफ|दिल का दौरा|आपातकाल|बेहोश|रक्तस्राव|ತುರ್ತು|ಆಪತ್ಕಾಲ|ಎದೆ ನೋವು|ಹೃದಯಾಘಾತ|ಉಸಿರಾಟದ ತೊಂದರೆ)/i;
  if (emergencyLatinRegex.test(lower) || emergencyIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.EMERGENCY,
      confidence: 1.0,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 2. Numbered Menu Selection Shortcuts (1 - 5)
  if (/^1(\s+.*|$)/.test(trimmed)) {
    const medQuery = extractMedicineQuery(trimmed);
    return {
      intent: INTENTS.MEDICINE_SEARCH,
      confidence: 0.98,
      language: lang,
      entities: { medicine: medQuery || 'Paracetamol', query: medQuery },
      tier: 1
    };
  }

  if (/^2(\s+.*|$)/.test(trimmed)) {
    return {
      intent: INTENTS.REMINDERS,
      confidence: 0.98,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  if (/^3(\s+.*|$)/.test(trimmed)) {
    return {
      intent: INTENTS.PHARMACY,
      confidence: 0.98,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  if (/^4(\s+.*|$)/.test(trimmed)) {
    return {
      intent: INTENTS.PRESCRIPTION_UPLOAD,
      confidence: 0.98,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  if (/^5(\s+.*|$)/.test(trimmed)) {
    return {
      intent: INTENTS.HELP,
      confidence: 0.98,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 3. Greetings
  const greetingRegex = /^(hi|hello|hey|namaste|namaskar|namaskara|vanakkam|pranam|halo|salaam|good morning|good afternoon|good evening|kaise ho|hegiddira|नमस्ते|ಪ್ರಣಾಮ|ನಮಸ್ಕಾರ)[\s!.,?]*$/i;
  if (greetingRegex.test(lower) || /^(hi|hello|hey|namaste|namaskara)\b/i.test(lower)) {
    return {
      intent: INTENTS.GREETING,
      confidence: 0.95,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 4. Voice Request
  const voiceLatinRegex = /\b(audio|voice|bolkar|sunao|awaz|audio reminder|voice note|dhwani)\b/i;
  const voiceIndicRegex = /(बोलकर|सुनाओ|आवाज़|आवाज|ಧ್ವನಿ|ವಾಯ್ಸ್)/i;
  if (voiceLatinRegex.test(lower) || voiceIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.VOICE_REQUEST,
      confidence: 0.95,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 5. Reminders
  const reminderLatinRegex = /\b(reminder|reminders|dawai ka time|pills time|schedule|dose time|aaj ki dawai|dawa ka time|kabb leni hai|remind me|dose)\b/i;
  const reminderIndicRegex = /(दवाई का समय|दवा का समय|गोली का समय|वೇಳಾಪಟ್ಟಿ|ಜ್ಞಾಪನೆ|ರಿಮೈಂಡರ್)/i;
  if (reminderLatinRegex.test(lower) || reminderIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.REMINDERS,
      confidence: 0.94,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 6. Pharmacy Discovery
  const pharmacyLatinRegex = /\b(pharmacy|medical shop|chemist|dawa ki dukan|dawai ki dukan|medical store|kahan milegi|chemist near me|medical near me)\b/i;
  const pharmacyIndicRegex = /(दवा की दुकान|दवाई की दुकान|मेडिकल स्टोर|औषधालय|ಔಷಧಾಲಯ|ಮೆಡಿಕಲ್ ಶಾಪ್)/i;
  if (pharmacyLatinRegex.test(lower) || pharmacyIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.PHARMACY,
      confidence: 0.94,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 7. Help / Menu
  const helpLatinRegex = /\b(help|menu|madad|options|kya kar sakte ho|sahayata|help me|sahaya|command|info)\b/i;
  const helpIndicRegex = /(मदद|सहायता|ಸಹಾಯ|ಮೆನು)/i;
  if (helpLatinRegex.test(lower) || helpIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.HELP,
      confidence: 0.92,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 8. Prescription Upload keywords
  const rxLatinRegex = /\b(prescription|parchi|rx|doctor ki parchi|upload prescription|photo bhejo)\b/i;
  const rxIndicRegex = /(पर्ची|प्रिस्क्रिप्शन|ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್)/i;
  if (rxLatinRegex.test(lower) || rxIndicRegex.test(trimmed)) {
    return {
      intent: INTENTS.PRESCRIPTION_UPLOAD,
      confidence: 0.90,
      language: lang,
      entities: { raw: trimmed },
      tier: 1
    };
  }

  // 9. Medicine Search (Keywords, Phrases, Devanagari/Kannada)
  const medSearchRegex = /(search|find|lookup|dawai|dawa|medicine|tablets|tablet|syrup|capsule|दवाई|दवा|ಔಷಧಿ|औषಧಿ|chahiye|khojo|khoje)/i;
  if (medSearchRegex.test(lower)) {
    const medQuery = extractMedicineQuery(trimmed);
    return {
      intent: INTENTS.MEDICINE_SEARCH,
      confidence: 0.92,
      language: lang,
      entities: { medicine: medQuery, query: medQuery },
      tier: 1
    };
  }

  // Common direct medicine names (e.g. Paracetamol, Metformin, Dolo, Crocin, Aspirin, Atorvastatin, Telma)
  const commonMedsRegex = /\b(paracetamol|dolo|crocin|metformin|aspirin|atorvastatin|amlodipine|pantocid|pan 40|augmentin|azithromycin|cetirizine|montair)\b/i;
  if (commonMedsRegex.test(lower)) {
    return {
      intent: INTENTS.MEDICINE_SEARCH,
      confidence: 0.90,
      language: lang,
      entities: { medicine: trimmed, query: trimmed },
      tier: 1
    };
  }

  return null;
}

/**
 * Tier 2: LLM Fallback (Google Gemini 2.0 Flash)
 */
async function matchTier2(text = '') {
  const lang = detectLanguage(text);
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key configured or placeholder, return safe fallback
  if (!apiKey || apiKey.startsWith('your_') || apiKey.trim() === '') {
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0.0,
      language: lang,
      entities: { raw: text },
      tier: 2,
      fallbackReason: 'GEMINI_API_KEY_NOT_CONFIGURED'
    };
  }

  try {
    const prompt = `You are the NLP engine of Quick Sanjeevani, a healthcare assistant for elderly patients in India.
Classify the following user message into exactly ONE of these intents:
- GREETING: Hello, greetings, casual opening.
- MEDICINE_SEARCH: Looking for medicine info, price, dosage, or availability.
- REMINDERS: Asking about daily schedule, dose times, pill reminders.
- PHARMACY: Looking for a nearby chemist or pharmacy shop.
- PRESCRIPTION_UPLOAD: Mentioning sending or uploading a doctor prescription.
- HELP: Asking for help, menu, commands, or what the bot can do.
- EMERGENCY: Urgent medical situation, chest pain, ambulance, severe distress.
- VOICE_REQUEST: Asking for voice/audio explanation.
- UNKNOWN: None of the above.

Extract any medicine entity if mentioned.
Detect user language (hi, kn, or en).

User Message: "${text.replace(/"/g, '\\"')}"

Return ONLY a valid JSON object without markdown fences, like:
{"intent": "MEDICINE_SEARCH", "confidence": 0.85, "language": "hi", "medicine": "Metformin"}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(
      endpoint,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      },
      { timeout: 4000 }
    );

    const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Empty response from Gemini');
    }

    // Clean JSON markdown fences if present
    const cleanJson = candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      intent: INTENTS[parsed.intent] || INTENTS.UNKNOWN,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      language: parsed.language || lang,
      entities: {
        medicine: parsed.medicine || extractMedicineQuery(text),
        query: parsed.medicine || text,
        raw: text
      },
      tier: 2
    };
  } catch (err) {
    // Robust fallback on network/API failure
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0.0,
      language: lang,
      entities: { raw: text },
      tier: 2,
      fallbackReason: err.message
    };
  }
}

/**
 * Main Two-Tier Intent Recognition Entrypoint
 */
async function detectIntent(text = '') {
  if (!text || typeof text !== 'string') {
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0.0,
      language: 'en',
      entities: {},
      tier: 1
    };
  }

  // Tier 1: Deterministic regex/keyword evaluation (<5ms)
  const tier1Result = matchTier1(text);
  if (tier1Result && tier1Result.confidence >= 0.7) {
    return tier1Result;
  }

  // Tier 2: Natural Language & LLM Fallback
  const tier2Result = await matchTier2(text);
  return tier2Result;
}

module.exports = {
  INTENTS,
  detectLanguage,
  extractMedicineQuery,
  matchTier1,
  matchTier2,
  detectIntent
};
