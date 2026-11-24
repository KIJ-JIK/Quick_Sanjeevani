/**
 * Quick Sanjeevani - Root Mobile Application (App.js)
 * Wraps entire application in elder-friendly ErrorBoundary,
 * initializes offline local database & pre-seeded medicine catalog,
 * monitors offline connectivity, and provides large-target bottom navigation.
 */

const React = require('./src/utils/react-shim');
const { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } = require('./src/utils/react-native-shim');
const ErrorBoundary = require('./src/components/ErrorBoundary');
const Header = require('./src/components/Header');
const DashboardScreen = require('./src/screens/DashboardScreen');
const MedicineSearchScreen = require('./src/screens/MedicineSearchScreen');
const PrescriptionsScreen = require('./src/screens/PrescriptionsScreen');
const OrdersScreen = require('./src/screens/OrdersScreen');
const SettingsScreen = require('./src/screens/SettingsScreen');
const { db } = require('./src/database');
const { api } = require('./src/services/apiService');
const { syncService } = require('./src/services/syncService');
const { colors, typography, layout, t } = require('./src/theme');

const TABS = [
  { id: 'dashboard', labelKey: 'tabDashboard', icon: '💊' },
  { id: 'search', labelKey: 'tabSearch', icon: '🔍' },
  { id: 'prescriptions', labelKey: 'tabPrescriptions', icon: '📋' },
  { id: 'orders', labelKey: 'tabOrders', icon: '🛍️' },
  { id: 'settings', labelKey: 'tabSettings', icon: '⚙️' },
];

function AppContent({ initialTab = 'dashboard', initialLanguage = 'en', isOffline = true, customDb = null }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [language, setLanguage] = React.useState(initialLanguage);
  const [dbReady, setDbReady] = React.useState(false);
  const activeDb = customDb || db;

  React.useEffect(() => {
    async function setupDb() {
      try {
        if (!activeDb.isInitialized) {
          await activeDb.init();
        }
        setDbReady(true);
      } catch (e) {
        setDbReady(true);
      }
    }
    setupDb();
  }, [activeDb]);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return React.createElement(DashboardScreen, {
          db: activeDb,
          language,
        });
      case 'search':
        return React.createElement(MedicineSearchScreen, {
          db: activeDb,
          language,
        });
      case 'prescriptions':
        return React.createElement(PrescriptionsScreen, {
          db: activeDb,
          language,
        });
      case 'orders':
        return React.createElement(OrdersScreen, {
          db: activeDb,
          language,
        });
      case 'settings':
        return React.createElement(SettingsScreen, {
          db: activeDb,
          api,
          syncService,
          language,
          onLanguageChange: setLanguage,
          isOffline,
        });
      default:
        return React.createElement(DashboardScreen, {
          db: activeDb,
          language,
        });
    }
  };

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return t('todaySchedule', language);
      case 'search':
        return t('tabSearch', language);
      case 'prescriptions':
        return t('tabPrescriptions', language);
      case 'orders':
        return t('tabOrders', language);
      case 'settings':
        return t('tabSettings', language);
      default:
        return '';
    }
  };

  return React.createElement(
    SafeAreaView,
    { style: styles.safeArea },
    // Header with dynamic offline banner & language toggle
    React.createElement(Header, {
      title: getScreenTitle(),
      isOffline,
      language,
      onLanguageChange: setLanguage,
      showLanguageToggle: true,
    }),

    // Screen Content
    React.createElement(
      View,
      { style: styles.screenContainer },
      renderActiveScreen()
    ),

    // Accessible Bottom Navigation Bar
    React.createElement(
      View,
      { style: styles.bottomNav },
      TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return React.createElement(
          TouchableOpacity,
          {
            key: tab.id,
            style: [styles.tabButton, isActive && styles.tabButtonActive],
            onPress: () => setActiveTab(tab.id),
            accessibilityRole: 'tab',
            accessibilityState: { selected: isActive },
            accessibilityLabel: t(tab.labelKey, language),
            activeOpacity: 0.7,
          },
          React.createElement(
            Text,
            { style: [styles.tabIcon, isActive && styles.tabIconActive] },
            tab.icon
          ),
          React.createElement(
            Text,
            { style: [styles.tabLabel, isActive && styles.tabLabelActive] },
            t(tab.labelKey, language)
          )
        );
      })
    )
  );
}

function App(props) {
  return React.createElement(
    ErrorBoundary,
    { language: props.initialLanguage || 'en' },
    React.createElement(AppContent, props)
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabButtonActive: {
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: typography.smallFontSize,
    fontWeight: typography.fontWeightMedium,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeightBold,
  },
});

module.exports = App;
