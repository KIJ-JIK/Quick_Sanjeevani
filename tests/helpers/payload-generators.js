/**
 * Quick Sanjeevani — Test Payload and Fixture Generators
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

function generateTwilioWebhook({
  from = 'whatsapp:+919876543210',
  to = 'whatsapp:+14155238886',
  body = 'Namaste',
  mediaUrl = null,
  mediaType = null
} = {}) {
  const payload = {
    From: from,
    To: to,
    Body: body,
    NumMedia: mediaUrl ? '1' : '0',
    MessageSid: `SM${Date.now()}_test_${Math.random().toString(36).substring(2, 8)}`,
  };
  if (mediaUrl) {
    payload.MediaUrl0 = mediaUrl;
    payload.MediaContentType0 = mediaType || 'image/jpeg';
  }
  return payload;
}

function generateSyncPayload({
  lastPulledAt = 0,
  createdPrescriptions = [],
  createdReminders = []
} = {}) {
  return {
    lastPulledAt,
    changes: {
      prescriptions: { created: createdPrescriptions, updated: [], deleted: [] },
      reminders: { created: createdReminders, updated: [], deleted: [] }
    }
  };
}

module.exports = {
  generateTwilioWebhook,
  generateSyncPayload
};
