/**
 * Quick Sanjeevani - Digital Prescription Vault Screen
 * Local digital vault for prescriptions with extracted medication dosages,
 * doctor / clinic details, diagnosis summary, and offline encryption status.
 */

const React = require('../utils/react-shim');
const { View, Text, TouchableOpacity, ScrollView, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');
const { TABLES, SYNC_STATUS } = require('../database/schema');

const SAMPLE_VAULT_PRESCRIPTIONS = [
  {
    id: 'rx_vault_sample_1',
    patient_id: 'p_elder_1',
    patient_name: 'Rameshwaridevi (72 Yrs)',
    doctor_name: 'Dr. Rajesh Sharma, MD',
    clinic_name: 'Apollo Medical Centre, Bengaluru',
    diagnosis: 'Hypertension & Type 2 Diabetes Management',
    date: '2026-11-20',
    status: 'active',
    sync_status: SYNC_STATUS.SYNCED,
    medicines: [
      { name: 'Telma 40', dosage: '40mg', frequency: 'Once daily (Morning)', duration: '30 Days' },
      { name: 'Glycomet 500', dosage: '500mg', frequency: 'Twice daily (Before meals)', duration: '30 Days' },
      { name: 'Ecosprin 75', dosage: '75mg', frequency: 'Once daily (Post-lunch)', duration: '30 Days' },
    ],
    notes: 'Monitor BP weekly. Low sodium diet advised.',
  },
  {
    id: 'rx_vault_sample_2',
    patient_id: 'p_elder_1',
    patient_name: 'Rameshwaridevi (72 Yrs)',
    doctor_name: 'Dr. Anand Kumar, Orthopedic Surgeon',
    clinic_name: 'Fortis Hospital, Bengaluru',
    diagnosis: 'Osteoarthritis Knee Pain',
    date: '2026-10-15',
    status: 'completed',
    sync_status: SYNC_STATUS.SYNCED,
    medicines: [
      { name: 'Shelcal 500', dosage: '500mg', frequency: 'Once daily (Breakfast)', duration: '60 Days' },
      { name: 'Volini Gel', dosage: 'Gel', frequency: 'Apply gently 3 times daily', duration: 'As needed' },
    ],
    notes: 'Gentle walking for 15 minutes recommended.',
  },
];

function PrescriptionsScreen({ db, language = 'en', onSelectPrescription }) {
  const [prescriptions, setPrescriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const loadPrescriptions = React.useCallback(async () => {
    if (!db) return;
    try {
      let items = await db.all(TABLES.PRESCRIPTIONS);
      if (items.length === 0) {
        // Pre-populate sample elder prescriptions in local vault
        for (const sample of SAMPLE_VAULT_PRESCRIPTIONS) {
          await db.insert(TABLES.PRESCRIPTIONS, sample);
        }
        items = await db.all(TABLES.PRESCRIPTIONS);
      }
      setPrescriptions(items);
    } catch (e) {
      setPrescriptions(SAMPLE_VAULT_PRESCRIPTIONS);
    } finally {
      setLoading(false);
    }
  }, [db]);

  React.useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  return React.createElement(
    ScrollView,
    { style: styles.container, contentContainerStyle: styles.contentContainer },
    // Vault Security Banner
    React.createElement(
      View,
      { style: styles.vaultHeaderBanner },
      React.createElement(Text, { style: styles.vaultIcon }, '🔒'),
      React.createElement(
        View,
        { style: { flex: 1, marginLeft: 10 } },
        React.createElement(
          Text,
          { style: styles.vaultTitle },
          t('prescriptionsTitle', language)
        ),
        React.createElement(
          Text,
          { style: styles.vaultSubtitle },
          'Prescriptions are saved locally on this device. Accessible anytime without internet.'
        )
      )
    ),

    // Prescription Count
    React.createElement(
      View,
      { style: styles.countRow },
      React.createElement(
        Text,
        { style: styles.countText },
        `${prescriptions.length} Prescriptions Stored Offline`
      )
    ),

    // Prescription List Cards
    prescriptions.length === 0
      ? React.createElement(
          View,
          { style: styles.emptyBox },
          React.createElement(Text, { style: styles.emptyIcon }, '📄'),
          React.createElement(
            Text,
            { style: styles.emptyText },
            t('noPrescriptions', language)
          )
        )
      : prescriptions.map((rx) => renderPrescriptionCard(rx, language, onSelectPrescription))
  );
}

function renderPrescriptionCard(rx, language, onSelectPrescription) {
  const isActive = rx.status === 'active';
  const medicines = Array.isArray(rx.medicines)
    ? rx.medicines
    : Array.isArray(rx.extractedMedicines)
    ? rx.extractedMedicines
    : [];

  return React.createElement(
    TouchableOpacity,
    {
      key: rx.id,
      style: styles.card,
      onPress: () => onSelectPrescription && onSelectPrescription(rx),
      activeOpacity: 0.8,
      accessibilityRole: 'button',
      accessibilityLabel: `Prescription from ${rx.doctor_name || 'Doctor'}, diagnosis ${rx.diagnosis}`,
    },
    // Doctor & Status Row
    React.createElement(
      View,
      { style: styles.cardTopRow },
      React.createElement(
        View,
        { style: { flex: 1 } },
        React.createElement(
          Text,
          { style: styles.doctorName },
          rx.doctor_name || rx.doctorName || 'Doctor'
        ),
        React.createElement(
          Text,
          { style: styles.clinicName },
          rx.clinic_name || rx.clinicName || 'Clinic'
        )
      ),
      React.createElement(
        View,
        {
          style: [
            styles.statusTag,
            isActive ? styles.statusTagActive : styles.statusTagCompleted,
          ],
        },
        React.createElement(
          Text,
          {
            style: [
              styles.statusTagText,
              isActive ? styles.statusTagTextActive : styles.statusTagTextCompleted,
            ],
          },
          isActive ? '● Active' : '✓ Completed'
        )
      )
    ),

    // Diagnosis & Date Row
    React.createElement(
      View,
      { style: styles.diagnosisBox },
      React.createElement(
        Text,
        { style: styles.diagnosisLabel },
        `${t('diagnosis', language)}: `
      ),
      React.createElement(
        Text,
        { style: styles.diagnosisValue },
        rx.diagnosis || 'Routine Checkup'
      )
    ),

    React.createElement(
      Text,
      { style: styles.dateText },
      `📅 ${t('date', language)}: ${rx.date || 'Recent'}`
    ),

    // Prescribed Medicines Section
    React.createElement(
      View,
      { style: styles.medsSection },
      React.createElement(
        Text,
        { style: styles.medsHeaderTitle },
        `💊 ${t('medicinesPrescribed', language)} (${medicines.length}):`
      ),
      medicines.map((med, idx) =>
        React.createElement(
          View,
          { key: idx, style: styles.medItemRow },
          React.createElement(
            Text,
            { style: styles.medBullet },
            '•'
          ),
          React.createElement(
            View,
            { style: { flex: 1, marginLeft: 6 } },
            React.createElement(
              Text,
              { style: styles.medItemName },
              `${med.name} ${med.dosage ? `(${med.dosage})` : ''}`
            ),
            React.createElement(
              Text,
              { style: styles.medItemFrequency },
              `${med.frequency || ''} ${med.duration ? `• ${med.duration}` : ''}`
            )
          )
        )
      )
    ),

    // Notes
    rx.notes
      ? React.createElement(
          Text,
          { style: styles.notesText },
          `📝 Note: ${rx.notes}`
        )
      : null
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
  vaultHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: layout.paddingMedium,
    borderRadius: layout.borderRadiusMedium,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  vaultIcon: {
    fontSize: 32,
  },
  vaultTitle: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  vaultSubtitle: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  countRow: {
    marginBottom: 12,
  },
  countText: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusMedium,
    padding: layout.paddingMedium,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  doctorName: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  clinicName: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTagActive: {
    backgroundColor: colors.successLight,
  },
  statusTagCompleted: {
    backgroundColor: colors.infoLight,
  },
  statusTagText: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
  },
  statusTagTextActive: {
    color: colors.success,
  },
  statusTagTextCompleted: {
    color: colors.info,
  },
  diagnosisBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  diagnosisLabel: {
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  diagnosisValue: {
    fontSize: typography.baseFontSize,
    color: colors.primaryDark,
    fontWeight: typography.fontWeightMedium,
  },
  dateText: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    marginBottom: 12,
  },
  medsSection: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: layout.borderRadiusSmall,
    marginBottom: 10,
  },
  medsHeaderTitle: {
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  medItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  medBullet: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  medItemName: {
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  medItemFrequency: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notesText: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: typography.baseFontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

module.exports = PrescriptionsScreen;
