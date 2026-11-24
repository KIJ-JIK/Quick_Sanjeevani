/**
 * Quick Sanjeevani - Elder Dashboard Screen
 * Today's medication timeline (Morning / Afternoon / Night),
 * dosage status pills (Taken / Pending), and prominent one-tap "Mark Taken" button.
 * Fully offline-first with immediate local database persistence and sync queuing.
 */

const React = require('../utils/react-shim');
const { View, Text, TouchableOpacity, ScrollView, StyleSheet } = require('../utils/react-native-shim');
const { colors, typography, layout, t } = require('../theme');
const { TABLES, SYNC_STATUS } = require('../database/schema');

// Initial default daily reminders for elders if no prescriptions loaded yet
const DEFAULT_SAMPLE_REMINDERS = [
  {
    id: 'rem_sample_morning_1',
    medicine_name: 'Dolo 650',
    dosage: '1 tablet (650mg)',
    instructions: 'Take with warm water after breakfast',
    time: '08:00',
    slot: 'morning',
    status: 'taken',
    taken_at: Date.now() - 3600000,
  },
  {
    id: 'rem_sample_morning_2',
    medicine_name: 'Glycomet 500',
    dosage: '1 tablet (500mg)',
    instructions: 'Take 10 mins before morning breakfast',
    time: '08:00',
    slot: 'morning',
    status: 'taken',
    taken_at: Date.now() - 3600000,
  },
  {
    id: 'rem_sample_afternoon_1',
    medicine_name: 'Becosules Z',
    dosage: '1 capsule',
    instructions: 'Take with lunch',
    time: '13:00',
    slot: 'afternoon',
    status: 'pending',
    taken_at: null,
  },
  {
    id: 'rem_sample_night_1',
    medicine_name: 'Atorva 10',
    dosage: '1 tablet (10mg)',
    instructions: 'Take at bedtime after light dinner',
    time: '20:30',
    slot: 'night',
    status: 'pending',
    taken_at: null,
  },
];

function DashboardScreen({ db, language = 'en', onMedicineSelect }) {
  const [reminders, setReminders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const loadReminders = React.useCallback(async () => {
    if (!db) return;
    try {
      let items = await db.all(TABLES.REMINDERS);
      if (items.length === 0) {
        // Seed default elder reminders for today's schedule
        for (const sample of DEFAULT_SAMPLE_REMINDERS) {
          await db.insert(TABLES.REMINDERS, {
            ...sample,
            sync_status: SYNC_STATUS.SYNCED,
          });
        }
        items = await db.all(TABLES.REMINDERS);
      }
      setReminders(items);
    } catch (e) {
      setReminders(DEFAULT_SAMPLE_REMINDERS);
    } finally {
      setLoading(false);
    }
  }, [db]);

  React.useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleMarkTaken = async (reminderId) => {
    if (!db) return;

    try {
      const now = Date.now();
      const updated = await db.update(TABLES.REMINDERS, reminderId, {
        status: 'taken',
        taken_at: now,
      });

      // Enqueue sync mutation for server
      await db.enqueueSync(TABLES.REMINDERS, reminderId, 'update', {
        status: 'taken',
        taken_at: now,
        updatedAt: new Date(now).toISOString(),
      });

      // Optimistic state update
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, status: 'taken', taken_at: now } : r))
      );
    } catch (e) {
      // In case of error, reload
      loadReminders();
    }
  };

  // Group reminders by time slot
  const slots = {
    morning: reminders.filter((r) => (r.slot === 'morning' || (r.time && r.time.startsWith('08')))),
    afternoon: reminders.filter((r) => (r.slot === 'afternoon' || (r.time && (r.time.startsWith('12') || r.time.startsWith('13'))))),
    night: reminders.filter((r) => (r.slot === 'night' || (r.time && (r.time.startsWith('20') || r.time.startsWith('21'))))),
  };

  const totalDoses = reminders.length;
  const takenDoses = reminders.filter((r) => r.status === 'taken').length;

  return React.createElement(
    ScrollView,
    { style: styles.container, contentContainerStyle: styles.contentContainer },
    // Daily Summary Progress Card
    React.createElement(
      View,
      { style: styles.summaryCard },
      React.createElement(
        View,
        { style: styles.summaryRow },
        React.createElement(
          Text,
          { style: styles.summaryTitle },
          t('todaySchedule', language)
        ),
        React.createElement(
          View,
          { style: styles.progressBadge },
          React.createElement(
            Text,
            { style: styles.progressBadgeText },
            `${takenDoses} / ${totalDoses} ${t('taken', language)}`
          )
        )
      ),
      React.createElement(
        Text,
        { style: styles.summarySub },
        takenDoses === totalDoses && totalDoses > 0
          ? '🌟 All medications completed for today! Stay healthy.'
          : 'Tap "Mark as Taken" after consuming each prescribed dose.'
      )
    ),

    // Timeline Bands
    renderSlotBand('morning', t('morning', language), '🌅 08:00 AM', slots.morning, language, handleMarkTaken, styles.morningBandHeader),
    renderSlotBand('afternoon', t('afternoon', language), '☀️ 01:00 PM', slots.afternoon, language, handleMarkTaken, styles.afternoonBandHeader),
    renderSlotBand('night', t('night', language), '🌙 08:30 PM', slots.night, language, handleMarkTaken, styles.nightBandHeader)
  );
}

function renderSlotBand(slotKey, title, timeLabel, items, language, onMarkTaken, headerStyle) {
  return React.createElement(
    View,
    { key: slotKey, style: styles.slotSection },
    React.createElement(
      View,
      { style: [styles.slotHeader, headerStyle] },
      React.createElement(Text, { style: styles.slotTitle }, title),
      React.createElement(Text, { style: styles.slotTime }, timeLabel)
    ),

    items.length === 0
      ? React.createElement(
          View,
          { style: styles.emptySlotBox },
          React.createElement(Text, { style: styles.emptySlotText }, 'No medicines scheduled')
        )
      : items.map((item) => renderMedicationCard(item, language, onMarkTaken))
  );
}

function renderMedicationCard(item, language, onMarkTaken) {
  const isTaken = item.status === 'taken';

  return React.createElement(
    View,
    { key: item.id, style: [styles.card, isTaken ? styles.cardTaken : styles.cardPending] },
    // Top Row: Medicine Name and Status Pill
    React.createElement(
      View,
      { style: styles.cardTopRow },
      React.createElement(
        View,
        { style: { flex: 1 } },
        React.createElement(Text, { style: styles.medicineName }, item.medicine_name),
        React.createElement(Text, { style: styles.medicineDosage }, item.dosage || '')
      ),
      // Status Pill
      React.createElement(
        View,
        { style: [styles.statusPill, isTaken ? styles.statusPillTaken : styles.statusPillPending] },
        React.createElement(
          Text,
          { style: [styles.statusPillText, isTaken ? styles.statusPillTextTaken : styles.statusPillTextPending] },
          isTaken ? `✓ ${t('taken', language)}` : `⏱ ${t('pending', language)}`
        )
      )
    ),

    // Instructions
    item.instructions
      ? React.createElement(
          Text,
          { style: styles.instructionsText },
          `💡 ${item.instructions}`
        )
      : null,

    // One-Tap "Mark Taken" Button (>= 48px height)
    !isTaken
      ? React.createElement(
          TouchableOpacity,
          {
            style: styles.markTakenButton,
            onPress: () => onMarkTaken(item.id),
            accessibilityLabel: `Mark ${item.medicine_name} as taken`,
            accessibilityRole: 'button',
            activeOpacity: 0.8,
          },
          React.createElement(
            Text,
            { style: styles.markTakenButtonText },
            `✓  ${t('markTaken', language)}`
          )
        )
      : React.createElement(
          View,
          { style: styles.takenConfirmedRow },
          React.createElement(
            Text,
            { style: styles.takenConfirmedText },
            item.taken_at ? `Completed at ${new Date(item.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Completed'
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusMedium,
    padding: layout.paddingMedium,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  progressBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressBadgeText: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  summarySub: {
    fontSize: typography.captionFontSize,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  slotSection: {
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: layout.borderRadiusSmall,
    marginBottom: 10,
  },
  morningBandHeader: {
    backgroundColor: colors.morningBand,
  },
  afternoonBandHeader: {
    backgroundColor: colors.afternoonBand,
  },
  nightBandHeader: {
    backgroundColor: colors.nightBand,
  },
  slotTitle: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  slotTime: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightMedium,
    color: colors.textSecondary,
  },
  emptySlotBox: {
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadiusSmall,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptySlotText: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  cardPending: {
    borderLeftWidth: 6,
    borderLeftColor: colors.secondary,
  },
  cardTaken: {
    borderLeftWidth: 6,
    borderLeftColor: colors.success,
    opacity: 0.9,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: typography.headingFontSize,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  medicineDosage: {
    fontSize: typography.baseFontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPillPending: {
    backgroundColor: colors.warningLight,
  },
  statusPillTaken: {
    backgroundColor: colors.successLight,
  },
  statusPillText: {
    fontSize: typography.captionFontSize,
    fontWeight: typography.fontWeightBold,
  },
  statusPillTextPending: {
    color: colors.warning,
  },
  statusPillTextTaken: {
    color: colors.success,
  },
  instructionsText: {
    fontSize: typography.captionFontSize,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  markTakenButton: {
    height: layout.buttonHeight,
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadiusSmall,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  markTakenButtonText: {
    color: colors.textLight,
    fontSize: typography.baseFontSize,
    fontWeight: typography.fontWeightBold,
  },
  takenConfirmedRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  takenConfirmedText: {
    fontSize: typography.captionFontSize,
    color: colors.success,
    fontWeight: typography.fontWeightMedium,
  },
});

module.exports = DashboardScreen;
