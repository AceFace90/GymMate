import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, radius } from '../../theme';

const STAGES = [
  { value: '1', label: 'Trimester 1', sublabel: 'Weeks 1–12', icon: '🌱' },
  { value: '2', label: 'Trimester 2', sublabel: 'Weeks 13–26', icon: '🌿' },
  { value: '3', label: 'Trimester 3', sublabel: 'Weeks 27–40', icon: '🌳' },
  { value: 'postpartum', label: 'Postpartum', sublabel: '', icon: '💜' },
];

const GUIDANCE = {
  1: {
    training: 'Continue your usual routine at reduced intensity. Avoid overheating. Listen to your body.',
    nutrition: 'Folate critical (leafy greens, fortified foods). Small frequent meals help nausea.',
    caution: 'Avoid contact sports. Stay hydrated. Heart rate monitoring recommended.',
  },
  2: {
    training: 'Modify supine exercises (avoid lying flat). Walking, swimming, prenatal yoga are excellent.',
    nutrition: 'Increase calories by ~340 kcal/day. Iron, calcium, and omega-3s are priority.',
    caution: 'Avoid heavy Valsalva manoeuvre. Diastasis recti risk — avoid deep crunches.',
  },
  3: {
    training: 'Lower intensity. Focus on pelvic floor, breath work, gentle stretching.',
    nutrition: 'Increase by ~450 kcal/day. Smaller meals as space reduces. Protein remains important.',
    caution: 'Balance and joint laxity challenges. Avoid lying on back. Watch for diastasis.',
  },
  postpartum: {
    training: 'Start with pelvic floor and diaphragmatic breathing. Gentle walks. Return to exercise at 6–8 weeks with clearance.',
    nutrition: 'Breastfeeding adds ~500 kcal/day need. Hydration critical. Nutrient-dense foods.',
    caution: 'Diastasis recti recovery first. Avoid high-impact until pelvic floor is stable. Be patient.',
  },
};

export default function PregnancyProfile({ form, onChange }) {
  const { theme } = useTheme();
  const guidance = GUIDANCE[form.trimester];
  const selected = STAGES.find((s) => s.value === form.trimester);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Pregnancy & Postpartum</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Your training and nutrition recommendations will be adapted for your current stage.
        Always consult your healthcare provider before exercising during pregnancy.
      </Text>

      {/* Stage selector */}
      <View style={styles.stageGrid}>
        {STAGES.map((s) => {
          const active = form.trimester === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              onPress={() => onChange('trimester', s.value)}
              activeOpacity={0.75}
              style={[
                styles.stageBtn,
                {
                  backgroundColor: active ? theme.accentBg : theme.card,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={styles.stageIcon}>{s.icon}</Text>
              <Text style={[styles.stageLabel, { color: active ? theme.accent : theme.text }]}>{s.label}</Text>
              {s.sublabel ? <Text style={[styles.stageSub, { color: theme.textMuted }]}>{s.sublabel}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {guidance && selected && (
        <View style={[styles.guidanceCard, { backgroundColor: theme.card, borderColor: theme.accentBorder }]}>
          <View style={styles.guidanceHeader}>
            <Text style={styles.guidanceIcon}>{selected.icon}</Text>
            <Text style={[styles.guidanceTitle, { color: theme.accent }]}>{selected.label}</Text>
          </View>

          <View style={styles.guidanceBody}>
            <View style={styles.guidanceRow}>
              <Text style={[styles.guidanceLabel, { color: theme.text }]}>Training Focus</Text>
              <Text style={[styles.guidanceText, { color: theme.textSecondary }]}>{guidance.training}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.guidanceRow}>
              <Text style={[styles.guidanceLabel, { color: theme.text }]}>Nutrition</Text>
              <Text style={[styles.guidanceText, { color: theme.textSecondary }]}>{guidance.nutrition}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.cautionBox, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
              <Text style={[styles.guidanceLabel, { color: '#f59e0b' }]}>⚠️ Cautions</Text>
              <Text style={[styles.guidanceText, { color: '#fde68a' }]}>{guidance.caution}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.disclaimer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
          This is general guidance only and does not replace professional medical advice. Always consult your obstetrician or midwife.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700' },
  description: { fontSize: typography.sizes.sm, lineHeight: 20 },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  stageBtn: {
    width: '47%', alignItems: 'center', padding: spacing[3],
    borderRadius: radius.lg, borderWidth: 1, gap: spacing[1],
  },
  stageIcon: { fontSize: 24 },
  stageLabel: { fontSize: typography.sizes.sm, fontWeight: '700' },
  stageSub: { fontSize: typography.sizes.xs },
  guidanceCard: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  guidanceIcon: { fontSize: 28 },
  guidanceTitle: { fontSize: typography.sizes.lg, fontWeight: '700' },
  guidanceBody: { paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[3] },
  guidanceRow: { gap: spacing[1] },
  guidanceLabel: { fontSize: typography.sizes.sm, fontWeight: '700' },
  guidanceText: { fontSize: typography.sizes.sm, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth },
  cautionBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing[3], gap: spacing[1] },
  disclaimer: { borderWidth: 1, borderRadius: radius.md, padding: spacing[3] },
  disclaimerText: { fontSize: typography.sizes.xs, lineHeight: 18, textAlign: 'center' },
});
