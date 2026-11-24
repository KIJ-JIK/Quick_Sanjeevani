/**
 * Quick Sanjeevani - Mobile Theme & Design Tokens
 * Specially designed for elderly patients:
 * - Soft healthcare palette (soft teal #00897B, warm orange #FF7043, deep slate #263238)
 * - AAA Contrast Compliance (deep slate on light backgrounds > 7:1)
 * - Minimum 48px touch targets for arthritis / motor tremor accessibility
 * - Readable typography (18px+ base font size)
 * - Multilingual translation strings for English, Hindi, and Kannada
 */

const colors = {
  primary: '#00897B',        // Soft Teal
  primaryLight: '#E0F2F1',   // Light Mint
  primaryDark: '#004D40',    // Deep Teal
  secondary: '#FF7043',      // Warm Orange
  secondaryLight: '#FBE9E7', // Pale Peach
  secondaryDark: '#D84315',  // Deep Rust
  textPrimary: '#263238',    // Deep Slate (High contrast)
  textSecondary: '#455A64',  // Medium Slate
  textMuted: '#607D8B',      // Slate Muted
  textLight: '#FFFFFF',      // White
  background: '#F8FAFB',     // Soft Off-White
  surface: '#FFFFFF',        // Pure White Card
  border: '#CFD8DC',         // Neutral Border
  borderStrong: '#90A4AE',   // High-contrast Border
  
  // Status Colors
  success: '#2E7D32',        // Forest Green
  successLight: '#E8F5E9',
  warning: '#F57F17',        // Amber Gold
  warningLight: '#FFF8E1',
  danger: '#C62828',         // Crimson Red
  dangerLight: '#FFEBEE',
  info: '#0277BD',           // Cerulean Blue
  infoLight: '#E1F5FE',

  // Medication Time Slot Band Backgrounds
  morningBand: '#FFF3E0',    // Warm Sunrise
  morningBorder: '#FFE0B2',
  afternoonBand: '#E1F5FE',  // Daylight Blue
  afternoonBorder: '#B3E5FC',
  nightBand: '#EDE7F6',      // Restful Lavender
  nightBorder: '#D1C4E9',
  
  // Offline Banner
  offlineBannerBg: '#FFF3E0',
  offlineBannerText: '#E65100',
  onlineBannerBg: '#E8F5E9',
  onlineBannerText: '#2E7D32',
};

const typography = {
  baseFontSize: 18,
  titleFontSize: 24,
  headingFontSize: 20,
  captionFontSize: 15,
  smallFontSize: 13,
  lineHeightBase: 26,
  lineHeightTitle: 32,
  fontWeightNormal: '400',
  fontWeightMedium: '600',
  fontWeightBold: '700',
};

const layout = {
  minTouchTarget: 48,
  buttonHeight: 52,
  inputHeight: 52,
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderRadiusSmall: 8,
  borderRadiusMedium: 12,
  borderRadiusLarge: 16,
  elevation: 2,
};

const translations = {
  en: {
    appTitle: 'Quick Sanjeevani',
    offlineStatus: 'Offline Mode - Showing Cached Data',
    onlineStatus: 'Online - Synced',
    tabDashboard: 'Schedule',
    tabSearch: 'Medicines',
    tabPrescriptions: 'Prescriptions',
    tabOrders: 'Orders',
    tabSettings: 'Settings',
    todaySchedule: "Today's Medication",
    morning: 'Morning',
    afternoon: 'Afternoon',
    night: 'Night',
    markTaken: 'Mark as Taken',
    taken: 'Taken',
    pending: 'Pending',
    emptySchedule: 'No medications scheduled for today.',
    searchPlaceholder: 'Search medicine or generic name (e.g. Paracetamol)...',
    otcBadge: 'OTC (Over-The-Counter)',
    rxBadge: 'Prescription Required',
    pricePerUnit: '₹ per strip',
    stockAvailable: 'In Stock',
    outOfStock: 'Out of Stock',
    prescriptionsTitle: 'Digital Prescription Vault',
    noPrescriptions: 'No prescriptions stored yet.',
    doctor: 'Doctor',
    clinic: 'Clinic',
    date: 'Date',
    diagnosis: 'Diagnosis',
    medicinesPrescribed: 'Prescribed Medicines',
    settingsTitle: 'Settings & Assistance',
    languageSection: 'Select Language',
    emergencySection: 'Emergency Contacts',
    ambulanceCall: 'Call 108 - Ambulance',
    nationalEmergencyCall: 'Call 112 - Emergency',
    caregiverCall: 'Call Primary Caregiver',
    syncSection: 'Data Synchronization',
    syncNow: 'Sync Now',
    syncing: 'Syncing...',
    syncSuccess: 'Synced successfully',
    syncFailed: 'Sync failed (saved locally)',
    lastSynced: 'Last Synced',
    errorTitle: 'Something went wrong, but your data is safe.',
    errorDesc: 'The app caught an unexpected error. Your offline schedule and medicines remain preserved.',
    tryAgain: 'Try Again',
  },
  hi: {
    appTitle: 'क्विक संजीवनी',
    offlineStatus: 'ऑफ़लाइन मोड - सहेजा गया डेटा',
    onlineStatus: 'ऑनलाइन - सिंक हो गया',
    tabDashboard: 'शेड्यूल',
    tabSearch: 'दवाइयाँ',
    tabPrescriptions: 'पर्चे',
    tabOrders: 'ऑर्डर',
    tabSettings: 'सेटिंग्स',
    todaySchedule: 'आज की दवाइयाँ',
    morning: 'सुबह',
    afternoon: 'दोपहर',
    night: 'रात',
    markTaken: 'दवा ले ली',
    taken: 'ली गई',
    pending: 'बाकी है',
    emptySchedule: 'आज के लिए कोई दवा निर्धारित नहीं है।',
    searchPlaceholder: 'दवा या सॉल्ट का नाम खोजें (उदा. पैरासिटामोल)...',
    otcBadge: 'बिना पर्चे के उपलब्ध (OTC)',
    rxBadge: 'डॉक्टर का पर्चा अनिवार्य',
    pricePerUnit: '₹ प्रति पत्ता',
    stockAvailable: 'उपलब्ध है',
    outOfStock: 'स्टॉक में नहीं',
    prescriptionsTitle: 'डिजिटल पर्चा वॉल्ट',
    noPrescriptions: 'अभी कोई पर्चा सुरक्षित नहीं है।',
    doctor: 'डॉक्टर',
    clinic: 'क्लिनिक',
    date: 'तारीख',
    diagnosis: 'निदान',
    medicinesPrescribed: 'निर्धारित दवाइयाँ',
    settingsTitle: 'सेटिंग्स एवं आपातकाल',
    languageSection: 'भाषा चुनें',
    emergencySection: 'आपातकालीन संपर्क',
    ambulanceCall: '108 - एम्बुलेंस को कॉल करें',
    nationalEmergencyCall: '112 - आपातकालीन सेवा',
    caregiverCall: 'मुख्य देखभालकर्ता को कॉल करें',
    syncSection: 'डेटा सिंक्रोनाइज़ेशन',
    syncNow: 'अभी सिंक करें',
    syncing: 'सिंक हो रहा है...',
    syncSuccess: 'सफलतापूर्वक सिंक हुआ',
    syncFailed: 'सिंक विफल (स्थानीय रूप से सुरक्षित)',
    lastSynced: 'अंतिम सिंक',
    errorTitle: 'कुछ समस्या हुई, लेकिन आपका डेटा सुरक्षित है।',
    errorDesc: 'ऐप में एक तकनीकी समस्या आई है। आपका ऑफ़लाइन शेड्यूल सुरक्षित है।',
    tryAgain: 'पुनः प्रयास करें',
  },
  kn: {
    appTitle: 'ಕ್ವಿಕ್ ಸಂಜೀವನಿ',
    offlineStatus: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್ - ಸಂಗ್ರಹಿಸಿದ ಡೇಟಾ',
    onlineStatus: 'ಆನ್‌ಲೈನ್ - ಸಿಂಕ್ ಮಾಡಲಾಗಿದೆ',
    tabDashboard: 'ವೇಳಾಪಟ್ಟಿ',
    tabSearch: 'ಔಷಧಿಗಳು',
    tabPrescriptions: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್',
    tabOrders: 'ಆರ್ಡರ್‌ಗಳು',
    tabSettings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    todaySchedule: 'ಇಂದಿನ ಔಷಧಿಗಳು',
    morning: 'ಬೆಳಿಗ್ಗೆ',
    afternoon: 'ಮಧ್ಯಾಹ್ನ',
    night: 'ರಾತ್ರಿ',
    markTaken: 'ತೆಗೆದುಕೊಂಡೆ ಎಂದು ಗುರುತಿಸಿ',
    taken: 'ತೆಗೆದುಕೊಂಡಿದೆ',
    pending: 'ಬಾಕಿ ಇದೆ',
    emptySchedule: 'ಇಂದು ಯಾವುದೇ ಔಷಧಿಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ.',
    searchPlaceholder: 'ಔಷಧಿ ಅಥವಾ ಉಪ್ಪಿನ ಹೆಸರನ್ನು ಹುಡುಕಿ (ಉದಾ. ಪ್ಯಾರಸಿಟಮಾಲ್)...',
    otcBadge: 'ವೈದ್ಯರ ಚೀಟಿ ಅಗತ್ಯವಿಲ್ಲ (OTC)',
    rxBadge: 'ವೈದ್ಯರ ಚೀಟಿ ಕಡ್ಡಾಯ',
    pricePerUnit: '₹ ಪ್ರತಿ ಸ್ಟ್ರಿಪ್',
    stockAvailable: 'ಲಭ್ಯವಿದೆ',
    outOfStock: 'ಸ್ಟಾಕ್ ಮುಗಿದಿದೆ',
    prescriptionsTitle: 'ಡಿಜಿಟಲ್ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ವಾಲ್ಟ್',
    noPrescriptions: 'ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಉಳಿಸಲಾಗಿಲ್ಲ.',
    doctor: 'ವೈದ್ಯರು',
    clinic: 'ಕ್ಲಿನಿಕ್',
    date: 'ದಿನಾಂಕ',
    diagnosis: 'ರೋಗನಿರ್ಣಯ',
    medicinesPrescribed: 'ನಿಗದಿತ ಔಷಧಿಗಳು',
    settingsTitle: 'ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ನೆರವು',
    languageSection: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
    emergencySection: 'ತುರ್ತು ಸಂಪರ್ಕಗಳು',
    ambulanceCall: '108 - ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ಕರೆ ಮಾಡಿ',
    nationalEmergencyCall: '112 - ತುರ್ತು ಸೇವೆಗೆ ಕರೆ ಮಾಡಿ',
    caregiverCall: 'ಮುಖ್ಯ ಆರೈಕೆದಾರರಿಗೆ ಕರೆ ಮಾಡಿ',
    syncSection: 'ಡೇಟಾ ಸಿಂಕ್ರೊನೈಸೇಶನ್',
    syncNow: 'ಈಗ ಸಿಂಕ್ ಮಾಡಿ',
    syncing: 'ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...',
    syncSuccess: 'ಯಶಸ್ವಿಯಾಗಿ ಸಿಂಕ್ ಆಗಿದೆ',
    syncFailed: 'ಸಿಂಕ್ ವಿಫಲವಾಗಿದೆ (ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ)',
    lastSynced: 'ಕೊನೆಯ ಸಿಂಕ್',
    errorTitle: 'ಒಂದು ತೊಂದರೆ ಉಂಟಾಗಿದೆ, ಆದರೆ ನಿಮ್ಮ ಡೇಟಾ ಸುರಕ್ಷಿತವಾಗಿದೆ.',
    errorDesc: 'ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ದೋಷ ಕಂಡುಬಂದಿದೆ. ನಿಮ್ಮ ಆಫ್‌ಲೈನ್ ವಿವರಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ.',
    tryAgain: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
  },
};

function t(key, lang = 'en') {
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

module.exports = {
  colors,
  typography,
  layout,
  translations,
  t,
};
