/**
 * Quick Sanjeevani - Mobile Header Component
 * Displays screen title, dynamic offline/online status banner,
 * and quick language switcher (English / Hindi / Kannada).
 */

const React = require('../utils/react-shim');
const { View, Text, TouchableOpacity, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'हिं', name: 'हिंदी' },
  { code: 'kn', label: 'ಕನ್ನ', name: 'ಕನ್ನಡ' },
];

function Header({
  title,
  isOffline = false,
  language = 'en',
  onLanguageChange,
  showLanguageToggle = true,
}) {
  const currentLangIndex = LANGUAGES.findIndex((l) => l.code === language);
  const nextLang = LANGUAGES[(currentLangIndex + 1) % LANGUAGES.length];

  const handleToggleLanguage = () => {
    if (onLanguageChange) {
      onLanguageChange(nextLang.code);
    }
  };

  const statusText = isOffline
    ? t('offlineStatus', language)
    : t('onlineStatus', language);

  return React.createElement(
    View,
    { style: styles.headerContainer },
    // 1. Status Bar Banner (Offline vs Online)
    React.createElement(
      View,
      {
        style: [
          styles.statusBanner,
          isOffline ? styles.offlineBanner : styles.onlineBanner,
        ],
      },
      React.createElement(
        Text,
        {
          style: [
            styles.statusBannerText,
            isOffline ? styles.offlineBannerText : styles.onlineBannerText,
          ],
        },
        isOffline ? `⚠️ ${statusText}` : `● ${statusText}`
      )
    ),

    // 2. Main Title Row with Language Toggle
    React.createElement(
      View,
      { style: styles.mainRow },
      React.createElement(
        View,
        { style: styles.titleContainer },
        React.createElement(
          Text,
          { style: styles.appTitle },
          t('appTitle', language)
        ),
        title
          ? React.createElement(
              Text,
              { style: styles.screenTitle },
              title
            )
          : null
      ),

      // Language Switcher Button (Min 48px touch target)
      showLanguageToggle
        ? React.createElement(
            TouchableOpacity,
            {
              style: styles.langButton,
              onPress: handleToggleLanguage,
              accessibilityLabel: `Switch language, current is ${language}`,
              accessibilityRole: 'button',
              activeOpacity: 0.7,
            },
            React.createElement(
              Text,
              { style: styles.langButtonText },
              `🌐 ${LANGUAGES[currentLangIndex]?.label || 'EN'}`
            )
          )
        : null
    )
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 8,
  },
  statusBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: colors.offlineBannerBg,
  },
  onlineBanner: {
    backgroundColor: colors.onlineBannerBg,
  },
  statusBannerText: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightMedium,
  },
  offlineBannerText: {
    color: colors.offlineBannerText,
  },
  onlineBannerText: {
    color: colors.onlineBannerText,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.paddingHorizontal,
    paddingVertical: 12,
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: typography.captionFontSize,
    color: colors.primary,
    fontWeight: typography.fontWeightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenTitle: {
    fontSize: typography.titleFontSize,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightBold,
    marginTop: 2,
  },
  langButton: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    backgroundColor: colors.primaryLight,
    borderRadius: layout.borderRadiusSmall,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  langButtonText: {
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
});

module.exports = Header;
