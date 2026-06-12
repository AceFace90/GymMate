import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, radius } from '../../theme';
import { getCurrentPhase, daysUntilNextPeriod, PHASES } from '../../utils/cyclePhase';

export default function CycleTracker({ form, onChange }) {
  const { theme } = useTheme();
  const phase = getCurrentPhase(form.cycleLastPeriodDate, form.cycleLength);
  const daysLeft = daysUntilNextPeriod(form.cycleLastPeriodDate, form.cycleLength);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Menstrual Cycle</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        We use your cycle data to tailor training intensity and nutrition guidance to each phase.
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>First day of last period</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
            value={form.cycleLastPeriodDate || ''}
            onChangeText={(v) => onChange('cycleLastPeriodDate', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Cycle length (days)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
            value={String(form.cycleLength || 28)}
            onChangeText={(v) => onChange('cycleLength', parseInt(v) || 28)}
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
          />
        </View>
      </View>

      {phase && (
        <View style={[styles.phaseCard, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: phase.color }]}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseIcon}>{phase.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label} Phase</Text>
              <Text style={[styles.phaseDay, { color: theme.textMuted }]}>Day {phase.dayInCycle} of {phase.cycleLength}</Text>
            </View>
            {daysLeft !== null && (
              <Text style={[styles.countdown, { color: theme.textMuted }]}>{daysLeft}d until next period</Text>
            )}
          </View>
          <View style={[styles.phaseDivider, { backgroundColor: theme.border }]} />
          <View style={styles.phaseBody}>
            <View style={styles.phaseDetail}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>Training</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{phase.trainingFocus}</Text>
            </View>
            <View style={styles.phaseDetail}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>Nutrition</Text>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{phase.nutrition}</Text>
            </View>
            <Text style={[styles.phaseNotes, { color: theme.textMuted }]}>{phase.notes}</Text>
          </View>
        </View>
      )}

      {/* Phase timeline pips */}
      <View style={styles.timeline}>
        {Object.entries(PHASES).map(([key, p]) => (
          <View
            key={key}
            style={[
              styles.pip,
              { backgroundColor: p.color, opacity: phase?.key === key ? 1 : 0.25 },
            ]}
          >
            <Text style={styles.pipIcon}>{p.icon}</Text>
            <Text style={[styles.pipLabel, { color: phase?.key === key ? '#fff' : 'transparent' }]}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700' },
  description: { fontSize: typography.sizes.sm },
  row: { flexDirection: 'row', gap: spacing[3] },
  label: { fontSize: typography.sizes.sm, fontWeight: '500', marginBottom: spacing[1] },
  input: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    fontSize: typography.sizes.base,
  },
  phaseCard: {
    borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.lg,
    overflow: 'hidden',
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], gap: spacing[3] },
  phaseIcon: { fontSize: 28 },
  phaseLabel: { fontSize: typography.sizes.base, fontWeight: '700' },
  phaseDay: { fontSize: typography.sizes.sm, marginTop: 2 },
  countdown: { fontSize: typography.sizes.xs, textAlign: 'right' },
  phaseDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing[4] },
  phaseBody: { padding: spacing[4], gap: spacing[3] },
  phaseDetail: { gap: spacing[1] },
  detailTitle: { fontSize: typography.sizes.sm, fontWeight: '700' },
  detailText: { fontSize: typography.sizes.sm, lineHeight: 20 },
  phaseNotes: { fontSize: typography.sizes.xs, lineHeight: 18 },
  timeline: { flexDirection: 'row', gap: spacing[2] },
  pip: { flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.md, gap: 2 },
  pipIcon: { fontSize: 16 },
  pipLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
});
