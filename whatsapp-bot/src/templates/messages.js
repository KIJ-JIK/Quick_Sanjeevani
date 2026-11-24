/**
 * Quick Sanjeevani — WhatsApp Bot Conversational Templates
 * Elder-friendly formatting with large numbered menus, high readability, and polite multilingual options.
 * Languages supported: Hindi ('hi'), Kannada ('kn'), English ('en').
 */

/**
 * Format a greeting / welcome message with numbered options.
 */
function welcome(lang = 'en') {
  if (lang === 'hi') {
    return (
      `🙏 *नमस्ते! त्वरित संजीवनी (Quick Sanjeevani) में आपका स्वागत है।*\n\n` +
      `मैं आपकी दवाइयों और सेहत की देखभाल में मदद करने के लिए यहाँ हूँ।\n\n` +
      `कृपया नीचे दिए गए विकल्पों में से चुनें (नंबर भेजें):\n\n` +
      `1️⃣ *दवाई खोजें* (उदा. "1 Paracetamol" या "दवाई Dolo")\n` +
      `2️⃣ *दवाई का समय / रिमाइंडर* (उदा. "2 Reminder" या "दवाई का समय")\n` +
      `3️⃣ *आस-पास का मेडिकल स्टोर* (उदा. "3 Pharmacy" या "दवा की दुकान")\n` +
      `4️⃣ *पर्ची भेजें* (डॉक्टर की पर्ची की फ़ोटो भेजें)\n` +
      `5️⃣ *मदद और आपातकालीन सेवा* (उदा. "5 Help" या "मदद")\n\n` +
      `👉 आप सीधे अपनी समस्या या बोलकर ऑडियो संदेश भी भेज सकते हैं।`
    );
  }

  if (lang === 'kn') {
    return (
      `🙏 *ನಮಸ್ಕಾರ! ಕ್ವಿಕ್ ಸಂಜೀವನಿ (Quick Sanjeevani) ಗೆ ಸುಸ್ವಾಗತ.*\n\n` +
      `ನಿಮ್ಮ ಔಷಧಿಗಳು ಮತ್ತು ಆರೋಗ್ಯದ ಕಾಳಜಿಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನಿದ್ದೇನೆ.\n\n` +
      `ದಯವಿಟ್ಟು ಕೆಳಗಿನ ಆಯ್ಕೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ (ಸಂಖ್ಯೆಯನ್ನು ಕಳುಹಿಸಿ):\n\n` +
      `1️⃣ *ಔಷಧಿ ಹುಡುಕಿ* (ಉದಾ. "1 Paracetamol" ಅಥವಾ "Dolo ಹುಡುಕಿ")\n` +
      `2️⃣ *ಔಷಧಿ ಜ್ಞಾಪನೆಗಳು* (ಉದಾ. "2 Reminder" ಅಥವಾ "ಸಮಯ ತಿಳಿಸಿ")\n` +
      `3️⃣ *ಹತ್ತಿರದ ಔಷಧಾಲಯ* (ಉದಾ. "3 Pharmacy" ಅಥವಾ "ಮೆಡಿಕಲ್ ಶಾಪ್")\n` +
      `4️⃣ *ವೈದ್ಯರ ಚೀಟಿ ಕಳುಹಿಸಿ* (ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ಕಳುಹಿಸಿ)\n` +
      `5️⃣ *ಸಹಾಯ ಮತ್ತು ತುರ್ತು ಸೇವೆ* (ಉದಾ. "5 Help" ಅಥವಾ "ಸಹಾಯ")\n\n` +
      `👉 ನೀವು ವಾಯ್ಸ್ ಮೆಸೇಜ್ ಕೂಡ ಕಳುಹಿಸಬಹುದು.`
    );
  }

  return (
    `🙏 *Namaste! Welcome to Quick Sanjeevani.*\n\n` +
    `Your personal offline-first healthcare and medication assistant.\n\n` +
    `Please select an option by replying with a number or text:\n\n` +
    `1️⃣ *Search Medicine* (e.g. "1 Paracetamol" or "search Dolo")\n` +
    `2️⃣ *Medication Reminders* (e.g. "2 Reminder" or "my schedule")\n` +
    `3️⃣ *Nearby Pharmacy* (e.g. "3 Pharmacy" or "chemist near me")\n` +
    `4️⃣ *Send Prescription* (Upload a prescription photo)\n` +
    `5️⃣ *Help & Emergency* (e.g. "5 Help" or "emergency")\n\n` +
    `👉 You can also reply in Hindi, Kannada, or send a voice message!`
  );
}

/**
 * Format medicine search result with comprehensive details.
 */
function medicineSearchResult(med, lang = 'en') {
  if (!med) return medicineNotFound('', lang);

  const priceStr = med.price ? `₹${Number(med.price).toFixed(2)}` : 'N/A';
  const rxStr = med.requiresPrescription ? '⚠️ Prescription Required (डॉक्टर की पर्ची आवश्यक)' : '✅ Over The Counter (बिना पर्ची मिल सकती है)';

  if (lang === 'hi') {
    return (
      `💊 *दवाई की जानकारी: ${med.name}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔹 *जेनेरिक नाम:* ${med.genericName || med.name}\n` +
      `🔹 *वर्ग (Category):* ${med.category || 'General'}\n` +
      `🔹 *खुराक / ताकत:* ${med.strength || 'Standard'}\n` +
      `🔹 *दाम (Price):* ${priceStr}\n` +
      `🔹 *निर्माता:* ${med.manufacturer || 'Certified Pharma'}\n` +
      `🔹 *पर्ची:* ${rxStr}\n\n` +
      `📝 *उपयोग व निर्देश:*\n${med.instructions || 'डॉक्टर की सलाह अनुसार लें।'}\n\n` +
      `💡 *सावधानी:* ${med.sideEffects ? med.sideEffects.join(', ') : 'कोई गंभीर साइड इफेक्ट नहीं।'}\n\n` +
      `👉 नज़दीकी दुकान जानने के लिए *"3"* भेजें।`
    );
  }

  if (lang === 'kn') {
    return (
      `💊 *ಔಷಧಿ ವಿವರ: ${med.name}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔹 *ಜೆನೆರಿಕ್ ಹೆಸರು:* ${med.genericName || med.name}\n` +
      `🔹 *ವರ್ಗ:* ${med.category || 'ಸಾಮಾನ್ಯ'}\n` +
      `🔹 *ಪ್ರಮಾಣ (Strength):* ${med.strength || 'Standard'}\n` +
      `🔹 *ಬೆಲೆ:* ${priceStr}\n` +
      `🔹 *ತಯಾರಕರು:* ${med.manufacturer || 'Certified Pharma'}\n\n` +
      `📝 *ಬಳಕೆಯ ಸೂಚನೆ:*\n${med.instructions || 'ವೈದ್ಯರ ಸಲಹೆಯಂತೆ ಸೇವಿಸಿ.'}\n\n` +
      `👉 ಹತ್ತಿರದ ಮೆಡಿಕಲ್ ಶಾಪ್ ತಿಳಿಯಲು *"3"* ಕಳುಹಿಸಿ.`
    );
  }

  return (
    `💊 *Medicine Details: ${med.name}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔹 *Generic Name:* ${med.genericName || med.name}\n` +
    `🔹 *Category:* ${med.category || 'General'}\n` +
    `🔹 *Strength:* ${med.strength || 'Standard'}\n` +
    `🔹 *Price:* ${priceStr}\n` +
    `🔹 *Manufacturer:* ${med.manufacturer || 'Certified Pharma'}\n` +
    `🔹 *Status:* ${rxStr}\n\n` +
    `📝 *Instructions:*\n${med.instructions || 'Use as directed by your physician.'}\n\n` +
    `💡 *Precautions:* ${med.sideEffects ? med.sideEffects.join(', ') : 'Take with water after food.'}\n\n` +
    `👉 Reply *"3"* to locate nearby pharmacies with this stock.`
  );
}

/**
 * Format medicine not found message.
 */
function medicineNotFound(query = '', lang = 'en') {
  if (lang === 'hi') {
    return (
      `🔍 *दवाई नहीं मिली*\n\n` +
      `क्षमा करें, "${query}" हमारे कैटलॉग में नहीं मिली।\n\n` +
      `सुझाव:\n` +
      `1. स्पेलिंग जांच कर पुनः लिखें (उदा. Paracetamol, Dolo 650, Metformin)\n` +
      `2. या अपनी डॉक्टर की पर्ची की फ़ोटो भेजें, हम उसे पढ़ लेंगे।`
    );
  }

  if (lang === 'kn') {
    return (
      `🔍 *ಔಷಧಿ ಕಂಡುಬಂದಿಲ್ಲ*\n\n` +
      `ಕ್ಷಮಿಸಿ, "${query}" ನಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ ದೊರೆತಿಲ್ಲ.\n\n` +
      `ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ಕಳುಹಿಸಿ.`
    );
  }

  return (
    `🔍 *Medicine Not Found*\n\n` +
    `We could not find "${query}" in our medicine directory.\n\n` +
    `Tips:\n` +
    `1. Please check the spelling (e.g. Paracetamol, Metformin, Dolo 650)\n` +
    `2. Or simply send a photo of your prescription and we will scan it for you.`
  );
}

/**
 * Format medication reminders / schedule.
 */
function reminders(scheduleList = [], lang = 'en') {
  const defaultItems = [
    { timeSlot: 'Morning (सुबह / ಬೆಳಿಗ್ಗೆ - 8:00 AM)', med: 'Metformin 500mg (1 tablet after breakfast)' },
    { timeSlot: 'Afternoon (दोपहर / ಮಧ್ಯಾಹ್ನ - 1:30 PM)', med: 'Multivitamin (1 tablet with water)' },
    { timeSlot: 'Night (रात / ರಾತ್ರಿ - 8:30 PM)', med: 'Amlodipine 5mg (1 tablet after dinner)' }
  ];

  const items = scheduleList && scheduleList.length > 0 ? scheduleList : defaultItems;

  if (lang === 'hi') {
    let msg = `⏰ *आज की दवाई का समय (Daily Medication Schedule)*\n━━━━━━━━━━━━━━━━━━\n\n`;
    items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.timeSlot || item.time || 'खुराक'}*\n   👉 ${item.med || item.medicineName || item.name || 'निर्धारित दवा'}\n\n`;
    });
    msg += `✅ क्या आपने अपनी सुबह की दवाई ले ली है? हाँ के लिए "YES" भेजें।`;
    return msg;
  }

  if (lang === 'kn') {
    let msg = `⏰ *ಇಂದಿನ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ (Daily Medication Schedule)*\n━━━━━━━━━━━━━━━━━━\n\n`;
    items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.timeSlot || item.time || 'ಸಮಯ'}*\n   👉 ${item.med || item.medicineName || item.name || 'ಔಷಧಿ'}\n\n`;
    });
    msg += `✅ ನೀವು ಬೆಳಗಿನ ಔಷಧಿ ಸೇವಿಸಿದ್ದೀರಾ? "YES" ಎಂದು ಕಳುಹಿಸಿ.`;
    return msg;
  }

  let msg = `⏰ *Today's Medication Schedule*\n━━━━━━━━━━━━━━━━━━\n\n`;
  items.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.timeSlot || item.time || 'Dose Time'}*\n   👉 ${item.med || item.medicineName || item.name || 'Prescribed medicine'}\n\n`;
  });
  msg += `✅ Have you taken your scheduled medicines? Reply "YES" to confirm.`;
  return msg;
}

/**
 * Format nearby pharmacies list.
 */
function nearbyPharmacies(pharmaciesList = [], lang = 'en') {
  if (!pharmaciesList || pharmaciesList.length === 0) {
    if (lang === 'hi') {
      return `🏥 *आस-पास के मेडिकल स्टोर*\n\nफिलहाल आपके आस-पास कोई मेडिकल स्टोर नहीं मिला। कृपया अपना पिनकोड या क्षेत्र साझा करें।`;
    }
    return `🏥 *Nearby Pharmacies*\n\nNo pharmacies located in your immediate radius. Please share your PIN code or area name.`;
  }

  if (lang === 'hi') {
    let msg = `🏥 *आपके नज़दीक उपलब्ध मेडिकल स्टोर*\n━━━━━━━━━━━━━━━━━━\n\n`;
    pharmaciesList.slice(0, 3).forEach((p, idx) => {
      const address = p.address ? `${p.address.street}, ${p.address.area}` : 'Bengaluru';
      msg += `${idx + 1}️⃣ *${p.name}*\n` +
             `   📍 ${address}\n` +
             `   📞 फ़ोन: ${p.phone || '9876543210'}\n` +
             `   ⭐ रेटिंग: ${p.rating || '4.5'}/5 | समय: ${p.openingHours || '8 AM - 10 PM'}\n\n`;
    });
    msg += `👉 दवाई मंगवाने के लिए स्टोर के नंबर पर कॉल करें।`;
    return msg;
  }

  if (lang === 'kn') {
    let msg = `🏥 *ಹತ್ತಿರದ ಮೆಡಿಕಲ್ ಸ್ಟೋರ್‌ಗಳು*\n━━━━━━━━━━━━━━━━━━\n\n`;
    pharmaciesList.slice(0, 3).forEach((p, idx) => {
      const address = p.address ? `${p.address.street}, ${p.address.area}` : 'Bengaluru';
      msg += `${idx + 1}️⃣ *${p.name}*\n` +
             `   📍 ${address}\n` +
             `   📞 ಫೋನ್: ${p.phone || '9876543210'}\n` +
             `   ⭐ ರೇಟಿಂಗ್: ${p.rating || '4.5'}/5\n\n`;
    });
    return msg;
  }

  let msg = `🏥 *Nearby Pharmacies Ready to Serve You*\n━━━━━━━━━━━━━━━━━━\n\n`;
  pharmaciesList.slice(0, 3).forEach((p, idx) => {
    const address = p.address ? `${p.address.street}, ${p.address.area}` : 'Bengaluru';
    msg += `${idx + 1}️⃣ *${p.name}*\n` +
           `   📍 ${address}\n` +
           `   📞 Phone: ${p.phone || '+91 80 2856 1122'}\n` +
           `   ⭐ Rating: ${p.rating || '4.6'}/5 | Hours: ${p.openingHours || '8:00 AM - 10:30 PM'}\n\n`;
  });
  msg += `👉 Call the pharmacy directly or reply with the store number to check stock.`;
  return msg;
}

/**
 * Format prescription extracted parsing result.
 */
function prescriptionExtracted(rxData, lang = 'en') {
  const patient = rxData.patientName || 'Elder Patient';
  const doctor = rxData.doctorName || 'Consultant Physician';
  const meds = rxData.extractedMedicines || rxData.medicines || [];

  if (lang === 'hi') {
    let msg = `📋 *डॉक्टर की पर्ची की जानकारी (Prescription Scanned)*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `👤 *मरीज़ का नाम:* ${patient}\n` +
              `👨‍⚕️ *डॉक्टर:* ${doctor}\n\n` +
              `💊 *पहचानी गई दवाइयाँ:*\n`;
    if (meds.length === 0) {
      msg += `   • कोई दवा स्पष्ट नहीं पढ़ी जा सकी। कृपया साफ फोटो भेजें।\n`;
    } else {
      meds.forEach((m, idx) => {
        const dosage = m.dosage || m.strength || '1 tablet';
        const freq = m.frequency || 'दिन में दो बार';
        msg += `   ${idx + 1}. *${m.name}* (${dosage}) - ${freq}\n`;
      });
    }
    msg += `\n👉 इन दवाइयों को नज़दीकी दुकान से मँगवाने के लिए *"3"* भेजें।`;
    return msg;
  }

  if (lang === 'kn') {
    let msg = `📋 *ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ವಿವರ (Prescription Scanned)*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `👤 *ರೋಗಿ:* ${patient}\n` +
              `👨‍⚕️ *ವೈದ್ಯರು:* ${doctor}\n\n` +
              `💊 *ಗುರುತಿಸಲಾದ ಔಷಧಿಗಳು:*\n`;
    meds.forEach((m, idx) => {
      msg += `   ${idx + 1}. *${m.name}* (${m.strength || m.dosage || '1 tablet'})\n`;
    });
    msg += `\n👉 ಹತ್ತಿರದ ಮೆಡಿಕಲ್ ಶಾಪ್ ತಿಳಿಯಲು *"3"* ಕಳುಹಿಸಿ.`;
    return msg;
  }

  let msg = `📋 *Prescription Scanned Successfully*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Patient:* ${patient}\n` +
            `👨‍⚕️ *Doctor:* ${doctor}\n\n` +
            `💊 *Extracted Medications:*\n`;
  if (meds.length === 0) {
    msg += `   • No medicines detected clearly. Please upload a higher resolution photo.\n`;
  } else {
    meds.forEach((m, idx) => {
      const dosage = m.dosage || m.strength || '1 tablet';
      const freq = m.frequency || 'Twice daily';
      msg += `   ${idx + 1}. *${m.name}* (${dosage}) — ${freq}\n`;
    });
  }
  msg += `\n👉 Reply *"3"* to locate nearby pharmacies with these medicines in stock.`;
  return msg;
}

/**
 * Format emergency alert response.
 */
function emergencyAlert(lang = 'en') {
  if (lang === 'hi') {
    return (
      `🚨 *आपातकालीन सहायता (EMERGENCY ASSISTANCE)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `यदि यह गंभीर चिकित्सा आपातकाल है, तो कृपया तुरंत कॉल करें:\n\n` +
      `🚑 *एम्बुलेंस (Ambulance):* 108 या 112\n` +
      `👴 *वरिष्ठ नागरिक हेल्पलाइन:* 14567\n` +
      `🏥 *नज़दीकी सरकारी अस्पताल:* 102\n\n` +
      `शांत रहें, गहरी सांस लें। परिवार या पड़ोसी को तुरंत सूचित करें।`
    );
  }

  if (lang === 'kn') {
    return (
      `🚨 *ತುರ್ತು ವೈದ್ಯಕೀಯ ಸಹಾಯ (EMERGENCY)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `ತಕ್ಷಣ ಕೆಳಗಿನ ಸಂಖ್ಯೆಗಳಿಗೆ ಕರೆ ಮಾಡಿ:\n\n` +
      `🚑 *ಅಂಬ್ಯುಲೆನ್ಸ್ (Ambulance):* 108 ಅಥವಾ 112\n` +
      `👴 *ಹಿರಿಯ ನಾಗರಿಕರ ಸಹಾಯವಾಣಿ:* 14567\n\n` +
      `ಧೈರ್ಯವಾಗಿರಿ, ಸಹಾಯ ತಲುಪಲಿದೆ.`
    );
  }

  return (
    `🚨 *EMERGENCY MEDICAL ASSISTANCE*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `If this is a life-threatening medical emergency, please call immediately:\n\n` +
    `🚑 *Emergency Ambulance:* 108 or 112\n` +
    `👴 *Senior Citizen National Helpline:* 14567\n` +
    `📞 *National Emergency:* 112\n\n` +
    `Please notify a nearby family member or neighbor immediately.`
  );
}

/**
 * Format help menu.
 */
function helpMenu(lang = 'en') {
  return welcome(lang);
}

/**
 * Format general fallback message.
 */
function generalFallback(lang = 'en') {
  if (lang === 'hi') {
    return (
      `🙏 *नमस्ते!*\n\n` +
      `क्षमा करें, मैं आपकी बात पूरी तरह समझ नहीं पाया।\n\n` +
      `आप नीचे दिए गए नंबरों में से कोई एक भेज सकते हैं:\n` +
      `1️⃣ दवाई खोजने के लिए (उदा. "1 Dolo")\n` +
      `2️⃣ दवाई के समय के लिए ("2")\n` +
      `3️⃣ मेडिकल स्टोर के लिए ("3")\n` +
      `4️⃣ पर्ची भेजने के लिए फोटो भेजें\n` +
      `5️⃣ मदद के लिए ("5")`
    );
  }

  if (lang === 'kn') {
    return (
      `🙏 *ನಮಸ್ಕಾರ!*\n\n` +
      `ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಸಂದೇಶ ಸರಿಯಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ.\n\n` +
      `ದಯವಿಟ್ಟು ಆಯ್ಕೆ ಮಾಡಿ:\n` +
      `1️⃣ ಔಷಧಿ ಹುಡುಕಲು ("1")\n` +
      `2️⃣ ವೇಳಾಪಟ್ಟಿಗೆ ("2")\n` +
      `3️⃣ ಔಷಧಾಲಯಕ್ಕೆ ("3")\n` +
      `4️⃣ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ಕಳುಹಿಸಿ`
    );
  }

  return (
    `🙏 *Greetings from Quick Sanjeevani!*\n\n` +
    `I did not quite understand that. You can reply with a number:\n` +
    `1️⃣ Search medicine (e.g. "1 Paracetamol")\n` +
    `2️⃣ Medication schedule / Reminders\n` +
    `3️⃣ Find nearby pharmacies\n` +
    `4️⃣ Send prescription photo\n` +
    `5️⃣ Help menu`
  );
}

module.exports = {
  welcome,
  medicineSearchResult,
  medicineNotFound,
  reminders,
  nearbyPharmacies,
  prescriptionExtracted,
  emergencyAlert,
  helpMenu,
  generalFallback
};
