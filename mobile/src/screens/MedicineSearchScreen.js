/**
 * Quick Sanjeevani - Offline Medicine Search Screen
 * Fast offline catalog search with generic name matching,
 * clear price indicators, and visual schedule warning badges.
 */

const React = require('../utils/react-shim');
const { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');

function MedicineSearchScreen({ db, language = 'en', onSelectMedicine }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const performSearch = React.useCallback(
    async (searchTerm) => {
      if (!db) return;
      setLoading(true);
      try {
        const meds = await db.searchMedicines(searchTerm, { limit: 30 });
        setResults(meds);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [db]
  );

  React.useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleClear = () => {
    setQuery('');
    performSearch('');
  };

  return React.createElement(
    View,
    { style: styles.container },
    // Search Bar Box
    React.createElement(
      View,
      { style: styles.searchBoxContainer },
      React.createElement(
        View,
        { style: styles.inputWrapper },
        React.createElement(Text, { style: styles.searchIcon }, '🔍'),
        React.createElement(TextInput, {
          style: styles.textInput,
          placeholder: t('searchPlaceholder', language),
          placeholderTextColor: colors.textMuted,
          value: query,
          onChangeText: setQuery,
          accessibilityLabel: 'Search for medicines or salts',
          autoCorrect: false,
          autoCapitalize: 'none',
        }),
        query.length > 0
          ? React.createElement(
              TouchableOpacity,
              {
                style: styles.clearButton,
                onPress: handleClear,
                accessibilityLabel: 'Clear search query',
              },
              React.createElement(Text, { style: styles.clearButtonText }, '✕')
            )
          : null
      ),
      React.createElement(
        Text,
        { style: styles.searchHint },
        '💡 Search by brand name ("Dolo", "Glycomet") or salt name ("Paracetamol", "Metformin")'
      )
    ),

    // Results List
    React.createElement(
      ScrollView,
      { style: styles.resultsList, contentContainerStyle: styles.resultsContent },
      React.createElement(
        View,
        { style: styles.resultsHeaderRow },
        React.createElement(
          Text,
          { style: styles.resultsCount },
          `${results.length} medicines found offline`
        )
      ),

      results.length === 0
        ? React.createElement(
            View,
            { style: styles.emptyBox },
            React.createElement(Text, { style: styles.emptyIcon }, '💊'),
            React.createElement(
              Text,
              { style: styles.emptyTitle },
              'No medicines match your search'
            ),
            React.createElement(
              Text,
              { style: styles.emptySub },
              'Try checking for generic spelling or browsing the catalog.'
            )
          )
        : results.map((med) => renderMedicineCard(med, language, onSelectMedicine))
    )
  );
}

function renderMedicineCard(med, language, onSelectMedicine) {
  const isScheduleH = med.schedule === 'Schedule H' || med.requires_prescription;
  const inStock = med.stock > 0;

  return React.createElement(
    TouchableOpacity,
    {
      key: med.id,
      style: styles.card,
      onPress: () => onSelectMedicine && onSelectMedicine(med),
      activeOpacity: 0.7,
      accessibilityRole: 'button',
      accessibilityLabel: `${med.name}, ${med.generic_name}, ₹${med.price}`,
    },
    // Top Row: Brand Name & Price
    React.createElement(
      View,
      { style: styles.cardHeader },
      React.createElement(
        View,
        { style: { flex: 1, marginRight: 8 } },
        React.createElement(Text, { style: styles.brandName }, med.name),
        React.createElement(
          Text,
          { style: styles.genericName },
          med.generic_name || med.genericName || ''
        )
      ),
      React.createElement(
        View,
        { style: styles.priceBox },
        React.createElement(
          Text,
          { style: styles.priceValue },
          `₹ ${med.price ? med.price.toFixed(2) : '0.00'}`
        ),
        React.createElement(
          Text,
          { style: styles.priceUnit },
          t('pricePerUnit', language)
        )
      )
    ),

    // Middle Row: Schedule Warning Badge & Category
    React.createElement(
      View,
      { style: styles.badgeRow },
      // Schedule Tag
      React.createElement(
        View,
        {
          style: [
            styles.badge,
            isScheduleH ? styles.scheduleHBadge : styles.otcBadge,
          ],
        },
        React.createElement(
          Text,
          {
            style: [
              styles.badgeText,
              isScheduleH ? styles.scheduleHText : styles.otcText,
            ],
          },
          isScheduleH
            ? `⚠️ ${t('rxBadge', language)}`
            : `✓ ${t('otcBadge', language)}`
        )
      ),

      // Category Pill
      med.category
        ? React.createElement(
            View,
            { style: styles.categoryPill },
            React.createElement(
              Text,
              { style: styles.categoryPillText },
              med.category
            )
          )
        : null
    ),

    // Details & Instructions
    med.instructions
      ? React.createElement(
          Text,
          { style: styles.instructionsPreview, numberOfLines: 2 },
          `📋 ${med.instructions}`
        )
      : null,

    // Footer: Manufacturer & Stock Status
    React.createElement(
      View,
      { style: styles.cardFooter },
      React.createElement(
        Text,
        { style: styles.manufacturerText },
        med.manufacturer ? `Mfg: ${med.manufacturer}` : ''
      ),
      React.createElement(
        Text,
        {
          style: [
            styles.stockText,
            inStock ? styles.stockAvailable : styles.stockOut,
          ],
        },
        inStock ? `● ${t('stockAvailable', language)}` : `○ ${t('outOfStock', language)}`
      )
    )
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBoxContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: layout.paddingHorizontal,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: layout.borderRadiusMedium,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    height: layout.inputHeight,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: typography.baseFontSize,
    color: colors.textPrimary,
    height: '100%',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  searchHint: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    padding: layout.paddingHorizontal,
    paddingBottom: 30,
  },
  resultsHeaderRow: {
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusMedium,
    padding: layout.paddingMedium,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brandName: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  genericName: {
    fontSize: typography.baseFontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: layout.borderRadiusSmall,
  },
  priceValue: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  priceUnit: {
    fontSize: typography.smallFontSize,
    color: colors.primaryDark,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  scheduleHBadge: {
    backgroundColor: colors.dangerLight,
  },
  scheduleHText: {
    color: colors.danger,
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
  },
  otcBadge: {
    backgroundColor: colors.successLight,
  },
  otcText: {
    color: colors.success,
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
  },
  categoryPill: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryPillText: {
    color: colors.info,
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightMedium,
  },
  instructionsPreview: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manufacturerText: {
    fontSize: typography.smallFontSize,
    color: colors.textMuted,
  },
  stockText: {
    fontSize: typography.smallFontSize,
    fontWeight: typography.fontWeightBold,
  },
  stockAvailable: {
    color: colors.success,
  },
  stockOut: {
    color: colors.danger,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: typography.baseFontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

module.exports = MedicineSearchScreen;
