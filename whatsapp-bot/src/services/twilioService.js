/**
 * Quick Sanjeevani — Twilio Outbound Dispatcher
 * Sends outbound WhatsApp messages via Twilio REST API.
 * Includes resilient Mock/Offline mode when Twilio credentials are absent.
 */

let twilioClient = null;

let httpClient;
try {
  httpClient = require('../utils/httpClient');
} catch {
  httpClient = null;
}
const dispatchedMessages = [];

/**
 * Normalize phone number into Twilio WhatsApp format: "whatsapp:+919876543210"
 */
function normalizeWhatsAppNumber(number = '') {
  if (!number) return 'whatsapp:+919876543210';
  let cleaned = String(number).trim();
  if (!cleaned.startsWith('whatsapp:')) {
    cleaned = `whatsapp:${cleaned}`;
  }
  return cleaned;
}

/**
 * Initialize or get Twilio REST client if valid credentials exist
 */
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (
    accountSid &&
    authToken &&
    !accountSid.startsWith('ACXXXX') &&
    !accountSid.includes('your_') &&
    process.env.NODE_ENV !== 'test'
  ) {
    if (!twilioClient) {
      try {
        const twilio = require('twilio');
        twilioClient = twilio(accountSid, authToken);
      } catch (err) {
        console.warn(`[TwilioService] Could not initialize Twilio client: ${err.message}`);
      }
    }
    return twilioClient;
  }

  return null;
}

/**
 * Dispatch outbound WhatsApp message
 * @param {Object} options
 * @param {string} options.to Recipient phone number (e.g. '+919876543210')
 * @param {string} [options.from] Twilio WhatsApp Sender (e.g. '+14155238886')
 * @param {string} options.body Text content
 * @param {string|string[]} [options.mediaUrl] Audio or image media URL
 * @returns {Promise<{ sid: string, status: string, to: string, from: string, body: string, mediaUrl: string[] }>}
 */
async function sendMessage({ to, from = null, body = '', mediaUrl = null } = {}) {
  const formattedTo = normalizeWhatsAppNumber(to);
  const defaultFrom = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const formattedFrom = normalizeWhatsAppNumber(from || defaultFrom);

  const mediaArray = [];
  if (mediaUrl) {
    if (Array.isArray(mediaUrl)) {
      mediaArray.push(...mediaUrl.filter(Boolean));
    } else if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
      mediaArray.push(mediaUrl.trim());
    }
  }

  const client = getTwilioClient();

  if (client) {
    try {
      const msgOptions = {
        from: formattedFrom,
        to: formattedTo,
        body: body || ''
      };
      if (mediaArray.length > 0) {
        msgOptions.mediaUrl = mediaArray;
      }

      const twilioRes = await client.messages.create(msgOptions);
      const record = {
        sid: twilioRes.sid,
        status: twilioRes.status || 'sent',
        to: formattedTo,
        from: formattedFrom,
        body,
        mediaUrl: mediaArray,
        timestamp: Date.now(),
        isLive: true
      };
      dispatchedMessages.push(record);
      return record;
    } catch (err) {
      console.warn(`[TwilioService] Live dispatch failed: ${err.message}. Falling back to mock record.`);
    }
  }

  // Mock / Offline mode
  const mockRecord = {
    sid: `mock_sid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status: 'queued',
    to: formattedTo,
    from: formattedFrom,
    body: body || '',
    mediaUrl: mediaArray,
    timestamp: Date.now(),
    isMock: true
  };

  dispatchedMessages.push(mockRecord);
  return mockRecord;
}

/**
 * Retrieve dispatched outbound messages for test inspection
 */
function getSentMessages() {
  return [...dispatchedMessages];
}

/**
 * Retrieve the most recently dispatched message
 */
function getLastSentMessage() {
  return dispatchedMessages.length > 0 ? dispatchedMessages[dispatchedMessages.length - 1] : null;
}

/**
 * Clear the in-memory message history
 */
function clearSentMessages() {
  dispatchedMessages.length = 0;
}

module.exports = {
  sendMessage,
  normalizeWhatsAppNumber,
  getSentMessages,
  getLastSentMessage,
  clearSentMessages
};
