/**
 * Quick Sanjeevani — WhatsApp Bot Webhook Handler & Detached Dispatcher
 * Responds with synchronous HTTP 200 TwiML (<50ms SLA) and detaches asynchronous
 * processing (Intent detection, OCR vision, ElevenLabs voice, Twilio dispatch) via setImmediate.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const intentService = require('./services/intentService');
const ocrService = require('./services/ocrService');
const ttsService = require('./services/ttsService');
const twilioService = require('./services/twilioService');
const templates = require('./templates/messages');

// Cache seed datasets for ultra-fast, offline medicine and pharmacy lookup
let cachedMedicines = [];
let cachedPharmacies = [];

try {
  const medsPath = path.resolve(__dirname, '../../server/src/seeds/medicines.seed.json');
  if (fs.existsSync(medsPath)) {
    cachedMedicines = JSON.parse(fs.readFileSync(medsPath, 'utf8'));
  }
} catch (err) {
  cachedMedicines = [];
}

try {
  const pharmPath = path.resolve(__dirname, '../../server/src/seeds/pharmacies.seed.json');
  if (fs.existsSync(pharmPath)) {
    cachedPharmacies = JSON.parse(fs.readFileSync(pharmPath, 'utf8'));
  }
} catch (err) {
  cachedPharmacies = [];
}

/**
 * Fuzzy/keyword medicine search over cached catalog
 */
function searchCatalog(query = '') {
  if (!query || cachedMedicines.length === 0) return null;
  const q = query.toLowerCase().trim();

  // 1. Exact match on brand name or generic name
  const exact = cachedMedicines.find(
    m => m.name.toLowerCase() === q || (m.genericName && m.genericName.toLowerCase() === q)
  );
  if (exact) return exact;

  // 2. Partial startsWith / includes match
  const partial = cachedMedicines.find(
    m => m.name.toLowerCase().includes(q) || (m.genericName && m.genericName.toLowerCase().includes(q))
  );
  if (partial) return partial;

  // 3. Fallback to common analgesic if paracetamol searched
  if (q.includes('paracetamol') || q.includes('fever') || q.includes('dard')) {
    return cachedMedicines.find(m => m.name.toLowerCase().includes('dolo') || m.name.toLowerCase().includes('crocin')) || cachedMedicines[0];
  }

  return null;
}

/**
 * Detached asynchronous message processor.
 * Executes heavy operations (OCR, NLP, ElevenLabs TTS, Twilio outbound)
 * without holding the webhook HTTP connection open.
 */
async function processIncomingMessage(payload = {}) {
  const from = payload.From || payload.from || 'whatsapp:+919876543210';
  const body = (payload.Body || payload.body || '').trim();
  const numMedia = parseInt(payload.NumMedia || payload.numMedia || '0', 10);
  const mediaUrl = payload.MediaUrl0 || payload.mediaUrl || null;
  const mediaContentType = payload.MediaContentType0 || payload.mediaContentType || payload.mediaType || 'image/jpeg';

  try {
    // 1. Prescription Photo / Media Handling
    if (numMedia > 0 || mediaUrl) {
      const ocrResult = await ocrService.processPrescription({
        mediaUrl,
        mediaContentType
      });

      const lang = intentService.detectLanguage(body);
      const replyText = templates.prescriptionExtracted(ocrResult, lang);

      // Optionally synthesize audio confirmation in regional language if requested
      let audioUrl = null;
      if (body.toLowerCase().includes('audio') || body.toLowerCase().includes('voice')) {
        const ttsRes = await ttsService.generateVoiceNote({
          text: `Aapki parchi scan ho gayi hai. ${ocrResult.extractedMedicines.length} dawaiyan mili hain.`,
          language: lang
        });
        audioUrl = ttsRes.audioUrl;
      }

      await twilioService.sendMessage({
        to: from,
        body: replyText,
        mediaUrl: audioUrl
      });
      return { success: true, type: 'prescription', ocrResult };
    }

    // 2. Text Message Handling: Two-Tier Intent Recognition
    const intentResult = await intentService.detectIntent(body);
    const lang = intentResult.language || 'en';
    let replyText = '';
    let audioUrl = null;

    switch (intentResult.intent) {
      case intentService.INTENTS.GREETING:
        replyText = templates.welcome(lang);
        break;

      case intentService.INTENTS.MEDICINE_SEARCH: {
        const medQuery = intentResult.entities?.medicine || intentResult.entities?.query || body;
        const found = searchCatalog(medQuery);
        if (found) {
          replyText = templates.medicineSearchResult(found, lang);
        } else {
          replyText = templates.medicineNotFound(medQuery, lang);
        }
        break;
      }

      case intentService.INTENTS.REMINDERS:
        replyText = templates.reminders([], lang);
        break;

      case intentService.INTENTS.PHARMACY:
        replyText = templates.nearbyPharmacies(cachedPharmacies, lang);
        break;

      case intentService.INTENTS.PRESCRIPTION_UPLOAD:
        replyText = templates.helpMenu(lang);
        break;

      case intentService.INTENTS.HELP:
        replyText = templates.helpMenu(lang);
        break;

      case intentService.INTENTS.ORDER_MEDICINE: {
        const medName = intentResult.entities?.medicine || 'Dolo 650';
        const found = searchCatalog(medName);
        const unitPrice = found ? Number(found.price || 30.50) : 45.00;
        const displayName = found ? found.name : medName;
        const orderNumber = `QS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const simulatedOrder = {
          orderNumber,
          customerPhone: from,
          items: [{ medicineName: displayName, quantity: 1, subtotal: unitPrice }],
          totalAmount: unitPrice,
          pharmacyName: 'City Chemist & Druggist (Yelahanka)',
          estimatedDeliveryMinutes: 25,
          paymentUrl: `https://rzp.io/l/qs_${orderNumber.toLowerCase()}`
        };

        replyText = templates.orderPlaced(simulatedOrder, lang);

        if (lang === 'hi' || body.toLowerCase().includes('voice') || body.toLowerCase().includes('audio')) {
          const ttsRes = await ttsService.generateVoiceNote({
            text: `Aapka ${displayName} ka order darj kar liya gaya hai. Payment link WhatsApp par bhej diya gaya hai. City Chemist se 25 minute me dawai pahunch jayegi.`,
            language: lang
          });
          audioUrl = ttsRes.audioUrl;
        } else if (lang === 'kn') {
          const ttsRes = await ttsService.generateVoiceNote({
            text: `Nimma ${displayName} aushadhi order sweekarisalaagide. UPI link kaluhisalaagide.`,
            language: lang
          });
          audioUrl = ttsRes.audioUrl;
        }
        break;
      }

      case intentService.INTENTS.REFILL:
        replyText = templates.refillSummary([], lang);
        break;

      case intentService.INTENTS.EMERGENCY:
        replyText = templates.emergencyAlert(lang);
        break;

      case intentService.INTENTS.VOICE_REQUEST: {
        replyText = templates.reminders([], lang);
        const ttsRes = await ttsService.generateVoiceNote({
          text: `Namaste! Aaj subah aapko Metformin 500mg leni hai khane ke baad.`,
          language: lang
        });
        audioUrl = ttsRes.audioUrl;
        break;
      }

      case intentService.INTENTS.UNKNOWN:
      default:
        replyText = templates.generalFallback(lang);
        break;
    }

    // Check if user specifically requested audio or if this was an audio reminder test
    if (body.toLowerCase().includes('audio') || body.toLowerCase().includes('voice')) {
      const ttsRes = await ttsService.generateVoiceNote({
        text: replyText.slice(0, 300),
        language: lang
      });
      audioUrl = ttsRes.audioUrl;
    }

    // Dispatch Outbound WhatsApp reply
    await twilioService.sendMessage({
      to: from,
      body: replyText,
      mediaUrl: audioUrl
    });

    return { success: true, intent: intentResult.intent, language: lang, body: replyText };
  } catch (err) {
    console.error(`[Webhook] Asynchronous message dispatch error:`, err);
    // Send polite emergency fallback message on error
    try {
      await twilioService.sendMessage({
        to: from,
        body: templates.generalFallback('en')
      });
    } catch (sendErr) {
      console.error(`[Webhook] Failed to send fallback message:`, sendErr);
    }
    return { success: false, error: err.message };
  }
}

/**
 * Webhook Route Handler
 * Complies with Twilio Fast Webhook SLA (<50ms).
 */
const webhookHandler = (req, res) => {
  // 1. Immediately return HTTP 200 with empty TwiML <Response></Response>
  res.writeHead(200, {
    'Content-Type': 'text/xml',
    'X-Ack-Duration': 'sub-50ms'
  });
  res.end('<Response></Response>');

  // 2. Detach heavy processing to event loop via setImmediate
  const payload = req.body || {};
  setImmediate(() => {
    processIncomingMessage(payload).catch(err => {
      console.error('[Webhook] Unhandled background error:', err);
    });
  });
};

// Mount route on both /api/whatsapp/webhook and /webhook
router.post('/webhook', webhookHandler);
router.post('/api/whatsapp/webhook', webhookHandler);

// Inspection endpoint for dispatched messages (used by testing harnesses and verification)
router.get('/dispatched', (req, res) => {
  res.json({
    count: twilioService.getSentMessages().length,
    messages: twilioService.getSentMessages()
  });
});

module.exports = router;
module.exports.processIncomingMessage = processIncomingMessage;
module.exports.searchCatalog = searchCatalog;
