/**
 * Quick Sanjeevani - Elder-Friendly React ErrorBoundary
 * Catches UI rendering crashes, stores diagnostic telemetry,
 * and renders a warm, high-contrast fallback screen with an accessible "Try Again" button.
 */

const React = require('../utils/react-shim');
const { View, Text, TouchableOpacity, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');

class ErrorBoundary extends React.Component {
  static telemetryLogs = [];

  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: error ? error.message : 'Unknown rendering error',
      stack: error ? error.stack : null,
      componentStack: errorInfo ? errorInfo.componentStack : null,
    };

    ErrorBoundary.telemetryLogs.push(logEntry);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  static getTelemetryLogs() {
    return [...ErrorBoundary.telemetryLogs];
  }

  static clearTelemetryLogs() {
    ErrorBoundary.telemetryLogs = [];
  }

  render() {
    const { hasError, error } = this.state;
    const { children, language = 'en' } = this.props;

    if (hasError) {
      const errorTitle = t('errorTitle', language);
      const errorDesc = t('errorDesc', language);
      const tryAgainLabel = t('tryAgain', language);

      return React.createElement(
        View,
        { style: styles.container },
        React.createElement(
          View,
          { style: styles.card },
          // Attention Icon Pill
          React.createElement(
            View,
            { style: styles.iconContainer },
            React.createElement(Text, { style: styles.iconText }, '⚠️')
          ),

          // Main Header Message
          React.createElement(
            Text,
            { style: styles.titleText, accessibilityRole: 'header' },
            errorTitle
          ),

          // Descriptive Reassurance
          React.createElement(
            Text,
            { style: styles.descText },
            errorDesc
          ),

          // Technical message for caregivers (optional preview)
          error && error.message
            ? React.createElement(
                View,
                { style: styles.debugBox },
                React.createElement(
                  Text,
                  { style: styles.debugText },
                  `Note: ${error.message}`
                )
              )
            : null,

          // Large Touch-Target Recovery Button (>= 48px)
          React.createElement(
            TouchableOpacity,
            {
              style: styles.retryButton,
              onPress: this.handleReset,
              accessibilityLabel: tryAgainLabel,
              accessibilityRole: 'button',
              activeOpacity: 0.8,
            },
            React.createElement(
              Text,
              { style: styles.retryButtonText },
              `↺  ${tryAgainLabel}`
            )
          )
        )
      );
    }

    return children || null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.paddingHorizontal,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusLarge,
    padding: layout.paddingLarge,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  titleText: {
    fontSize: typography.titleFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: typography.lineHeightTitle,
  },
  descText: {
    fontSize: typography.baseFontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: typography.lineHeightBase,
  },
  debugBox: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: layout.borderRadiusSmall,
    marginBottom: 20,
    width: '100%',
  },
  debugText: {
    fontSize: typography.captionFontSize,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  retryButton: {
    height: layout.buttonHeight,
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadiusMedium,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  retryButtonText: {
    color: colors.textLight,
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
  },
});

module.exports = ErrorBoundary;
