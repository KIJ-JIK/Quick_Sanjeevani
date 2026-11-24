/**
 * Quick Sanjeevani - Settings & Emergency Assistance Screen
 * - Multi-language selector: English, Hindi (हिंदी), Kannada (ಕನ್ನಡ)
 * - Emergency quick-dial cards: 108 Ambulance, 112 Emergency, Caregiver
 * - Manual "Sync Now" trigger with offline queue stats and sync status feedback.
 */

const React = require('../utils/react-shim');
const { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');
const { TABLES } = require('../database/schema');

function SettingsScreen({
  db,
  api,
  syncService,
  language = 'en',
  onLanguageChange,
  isOffline = false,
}) {
  const [syncStatus, setSyncStatus] = React.useState('idle'); // 'idle', 'syncing', 'success', 'failed'
  const [syncMessage, setSyncMessage] = React.useState('');
  const [cacheStats, setCacheStats] = React.useState({
    medicinesCount: 0,
    prescriptionsCount: 0,
    pendingSyncCount: 0,
    lastPulledAt: 0,
  });

  const loadStats = React.useCallback(async () => {
    if (!db) return;
    try {
      const medCount = await db.count(TABLES.MEDICINES);
      const rxCount = await db.count(TABLES.PRESCRIPTIONS);
      const pendingItems = await db.getPendingSync();
      setCacheStats({
        medicinesCount: medCount,
        prescriptionsCount: rxCount,
        pendingSyncCount: pendingItems.length,
        lastPulledAt: db.getLastPulledAt() || 0,
      });
    } catch (e) {
      // Ignored
    }
  }, [db]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleManualSync = async () => {
    if (!syncService || !db || !api) return;

    setSyncStatus('syncing');
    setSyncMessage(t('syncing', language));

    try {
      const res = await syncService.sync(api, db);
      if (res.success) {
        setSyncStatus('success');
        setSyncMessage(
          `${t('syncSuccess', language)} (Pushed: ${res.pushedCount}, Pulled: ${res.pulledCount})`
        );
      } else {
        setSyncStatus('failed');
        setSyncMessage(
          res.offline
            ? `${t('syncFailed', language)} - Offline`
            : `${t('syncFailed', language)}: ${res.error || 'Server error'}`
        );
      }
    } catch (err) {
      setSyncStatus('failed');
      setSyncMessage(`${t('syncFailed', language)}: ${err.message}`);
    } finally {
      loadStats();
    }
  };

  const handleDial = (number, name) => {
    Alert.alert(
      `Emergency Call: ${name}`,
      `Dialing ${number}...`,
      [{ text: 'OK' }]
    );
  };

  const languagesList = [
    { code: 'en', title: 'English', native: 'English' },
    { code: 'hi', title: 'Hindi', native: 'हिंदी' },
    { code: 'kn', title: 'Kannada', native: 'ಕನ್ನಡ' },
  ];

  return React.createElement(
    ScrollView,
    { style: styles.container, contentContainerStyle: styles.contentContainer },
    // Section 1: Emergency Contacts Quick-Dial Cards (Top Priority for Elders)
    React.createElement(
      View,
      { style: styles.sectionBox },
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `🚨 ${t('emergencySection', language)}`
      ),
      React.createElement(
        Text,
        { style: styles.sectionDesc },
        'Tap any card to instantly connect with medical assistance or family.'
      ),

      // 108 Ambulance Card (Red)
      React.createElement(
        TouchableOpacity,
        {
          style: [styles.emergencyCard, styles.emergencyCardAmbulance],
          onPress: () => handleDial('108', '108 Ambulance Service'),
          accessibilityRole: 'button',
          accessibilityLabel: 'Call 108 Ambulance Emergency',
          activeOpacity: 0.8,
        },
        React.createElement(Text, { style: styles.emergencyIcon }, '🚑'),
        React.createElement(
          View,
          { style: styles.emergencyInfo },
          React.createElement(
            Text,
            { style: styles.emergencyTitle },
            t('ambulanceCall', language)
          ),
          React.createElement(
            Text,
            { style: styles.emergencySub },
            '24/7 Government Medical Emergency Ambulance'
          )
        ),
        React.createElement(
          View,
          { style: styles.dialBadge },
          React.createElement(Text, { style: styles.dialBadgeText }, 'CALL 108')
        )
      ),

      // 112 National Emergency Card (Blue)
      React.createElement(
        TouchableOpacity,
        {
          style: [styles.emergencyCard, styles.emergencyCardNational],
          onPress: () => handleDial('112', '112 National Emergency'),
          accessibilityRole: 'button',
          accessibilityLabel: 'Call 112 National Emergency',
          activeOpacity: 0.8,
        },
        React.createElement(Text, { style: styles.emergencyIcon }, '🛡️'),
        React.createElement(
          View,
          { style: styles.emergencyInfo },
          React.createElement(
            Text,
            { style: styles.emergencyTitle },
            t('nationalEmergencyCall', language)
          ),
          React.createElement(
            Text,
            { style: styles.emergencySub },
            'Police, Fire & All-in-One Emergency Services'
          )
        ),
        React.createElement(
          View,
          { style: styles.dialBadge },
          React.createElement(Text, { style: styles.dialBadgeText }, 'CALL 112')
        )
      ),

      // Caregiver Card (Green)
      React.createElement(
        TouchableOpacity,
        {
          style: [styles.emergencyCard, styles.emergencyCardCaregiver],
          onPress: () => handleDial('+919876543210', 'Primary Caregiver (Son/Daughter)'),
          accessibilityRole: 'button',
          accessibilityLabel: 'Call Primary Caregiver',
          activeOpacity: 0.8,
        },
        React.createElement(Text, { style: styles.emergencyIcon }, '👨‍👩‍👧'),
        React.createElement(
          View,
          { style: styles.emergencyInfo },
          React.createElement(
            Text,
            { style: styles.emergencyTitle },
            t('caregiverCall', language)
          ),
          React.createElement(
            Text,
            { style: styles.emergencySub },
            'Ansh / Malathesh (+91 98765 43210)'
          )
        ),
        React.createElement(
          View,
          { style: [styles.dialBadge, styles.dialBadgeCaregiver] },
          React.createElement(Text, { style: styles.dialBadgeText }, 'CALL')
        )
      )
    ),

    // Section 2: Language Selector (English / Hindi / Kannada)
    React.createElement(
      View,
      { style: styles.sectionBox },
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `🌐 ${t('languageSection', language)}`
      ),
      React.createElement(
        View,
        { style: styles.languageRow },
        languagesList.map((lang) => {
          const isSelected = language === lang.code;
          return React.createElement(
            TouchableOpacity,
            {
              key: lang.code,
              style: [
                styles.languageButton,
                isSelected && styles.languageButtonSelected,
              ],
              onPress: () => onLanguageChange && onLanguageChange(lang.code),
              accessibilityRole: 'button',
              accessibilityLabel: `Select language ${lang.native}`,
            },
            React.createElement(
              Text,
              {
                style: [
                  styles.languageButtonText,
                  isSelected && styles.languageButtonTextSelected,
                ],
              },
              lang.native
            ),
            React.createElement(
              Text,
              {
                style: [
                  styles.languageButtonSub,
                  isSelected && styles.languageButtonSubSelected,
                ],
              },
              lang.title
            )
          );
        })
      )
    ),

    // Section 3: Data Synchronization & Offline Cache Stats
    React.createElement(
      View,
      { style: styles.sectionBox },
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `🔄 ${t('syncSection', language)}`
      ),

      // Cache Stats Overview
      React.createElement(
        View,
        { style: styles.statsCard },
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statNumber }, String(cacheStats.medicinesCount)),
          React.createElement(Text, { style: styles.statLabel }, 'Medicines')
        ),
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statNumber }, String(cacheStats.prescriptionsCount)),
          React.createElement(Text, { style: styles.statLabel }, 'Prescriptions')
        ),
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(
            Text,
            {
              style: [
                styles.statNumber,
                cacheStats.pendingSyncCount > 0 ? styles.statNumberPending : null,
              ],
            },
            String(cacheStats.pendingSyncCount)
          ),
          React.createElement(Text, { style: styles.statLabel }, 'Pending Sync')
        )
      ),

      // Sync Feedback Message
      syncMessage
        ? React.createElement(
            View,
            {
              style: [
                styles.syncAlertBox,
                syncStatus === 'success'
                  ? styles.syncAlertSuccess
                  : syncStatus === 'failed'
                  ? styles.syncAlertFailed
                  : styles.syncAlertInfo,
              ],
            },
            React.createElement(
              Text,
              {
                style: [
                  styles.syncAlertText,
                  syncStatus === 'success'
                    ? styles.syncAlertTextSuccess
                    : syncStatus === 'failed'
                    ? styles.syncAlertTextFailed
                    : styles.syncAlertTextInfo,
                ],
              },
              syncMessage
            )
          )
        : null,

      // Manual Sync Button (>= 48px height)
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.syncNowButton,
            syncStatus === 'syncing' ? styles.syncNowButtonDisabled : null,
          ],
          onPress: handleManualSync,
          disabled: syncStatus === 'syncing',
          accessibilityRole: 'button',
          accessibilityLabel: 'Trigger manual delta sync with server',
        },
        React.createElement(
          Text,
          { style: styles.syncNowButtonText },
          syncStatus === 'syncing' ? `⏳ ${t('syncing', language)}` : `🔄 ${t('syncNow', language)}`
        )
      ),

      // Last Synced Timestamp
      React.createElement(
        Text,
        { style: styles.lastSyncedText },
        cacheStats.lastPulledAt > 0
          ? `${t('lastSynced', language)}: ${new Date(cacheStats.lastPulledAt).toLocaleString()}`
          : `${t('lastSynced', language)}: Never (Pre-seeded catalog loaded)`
      )
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: layout.paddingHorizontal,
    paddingBottom: 40,
  },
  sectionBox: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusMedium,
    padding: layout.paddingMedium,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: layout.borderRadiusSmall,
    marginBottom: 10,
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
  },
  emergencyCardAmbulance: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  emergencyCardNational: {
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  emergencyCardCaregiver: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  emergencyIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  emergencySub: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dialBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialBadgeCaregiver: {
    backgroundColor: colors.success,
  },
  dialBadgeText: {
    color: colors.textLight,
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  languageButton: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.background,
    borderRadius: layout.borderRadiusSmall,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  languageButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  languageButtonText: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  languageButtonTextSelected: {
    color: colors.primaryDark,
  },
  languageButtonSub: {
    fontSize: typography.smallFontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  languageButtonSubSelected: {
    color: colors.primaryDark,
    fontWeight: typography.fontWeightMedium,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: layout.borderRadiusSmall,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.titleFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  statNumberPending: {
    color: colors.secondary,
  },
  statLabel: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  syncAlertBox: {
    padding: 10,
    borderRadius: layout.borderRadiusSmall,
    marginBottom: 12,
  },
  syncAlertSuccess: {
    backgroundColor: colors.successLight,
  },
  syncAlertFailed: {
    backgroundColor: colors.dangerLight,
  },
  syncAlertInfo: {
    backgroundColor: colors.infoLight,
  },
  syncAlertText: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightMedium,
    textAlign: 'center',
  },
  syncAlertTextSuccess: {
    color: colors.success,
  },
  syncAlertTextFailed: {
    color: colors.danger,
  },
  syncAlertTextInfo: {
    color: colors.info,
  },
  syncNowButton: {
    height: layout.buttonHeight,
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadiusSmall,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncNowButtonDisabled: {
    opacity: 0.6,
  },
  syncNowButtonText: {
    color: colors.textLight,
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
  },
  lastSyncedText: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
});

module.exports = SettingsScreen;
