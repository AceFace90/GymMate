import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, radius } from '../../theme';
import { ACTIVITY_LABELS, GOAL_LABELS } from '../../utils/biometrics';

// Native picker substitute — simple segmented row for small option sets
function SegmentedPicker({ options, value, onChange, theme }) {
  return (
    <View style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <Text
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              { color: active ? (theme.isDark ? '#000' : '#fff') : theme.textSecondary,
                backgroundColor: active ? theme.accent : 'transparent',
                borderRightWidth: i < options.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderRightColor: theme.border,
              },
            ]}
          >
            {opt.label}
          </Text>
        );
      })}
    </View>
  );
}

// Simple select list rendered as tappable chips
function ChipPicker({ options, value, onChange, theme }) {
  return (
    <View style={styles.chipRow}>
      {Object.entries(options).map(([val, label]) => {
        const active = value === val;
        return (
          <Text
            key={val}
            onPress={() => onChange(val)}
            style={[
              styles.chip,
              {
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accentBg : theme.card,
                color: active ? theme.accent : theme.textSecondary,
              },
            ]}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
}

function Field({ label, optional, children, theme }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}{optional ? <Text style={{ color: theme.textMuted }}> (optional)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export default function UniversalFields({ form, onChange, theme: themeProp }) {
  const { theme: ctxTheme } = useTheme();
  const theme = themeProp || ctxTheme;
  const input = [styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>About You</Text>

      <View style={styles.row}>
        <Field label="Name" theme={theme} style={{ flex: 1 }}>
          <TextInput
            style={input}
            value={form.name || ''}
            onChangeText={(v) => onChange('name', v)}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
          />
        </Field>
        <Field label="Age" theme={theme} style={{ flex: 1 }}>
          <TextInput
            style={input}
            value={String(form.age || '')}
            onChangeText={(v) => onChange('age', v)}
            placeholder="Years"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
          />
        </Field>
      </View>

      <Field label="Biological Sex" theme={theme}>
        <SegmentedPicker
          theme={theme}
          value={form.sex}
          onChange={(v) => onChange('sex', v)}
          options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
        />
      </Field>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing[4] }]}>Body Metrics</Text>

      <View style={styles.row}>
        <Field label="Height (cm)" theme={theme}>
          <TextInput style={input} value={String(form.heightCm || '')} onChangeText={(v) => onChange('heightCm', v)} placeholder="cm" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
        </Field>
        <Field label="Weight (kg)" theme={theme}>
          <TextInput style={input} value={String(form.weightKg || '')} onChangeText={(v) => onChange('weightKg', v)} placeholder="kg" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
        </Field>
        <Field label="Body Fat %" optional theme={theme}>
          <TextInput style={input} value={String(form.bodyFatPct || '')} onChangeText={(v) => onChange('bodyFatPct', v)} placeholder="%" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
        </Field>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing[4] }]}>Training Profile</Text>

      <Field label="Activity Level" theme={theme}>
        <ChipPicker options={ACTIVITY_LABELS} value={form.activityLevel} onChange={(v) => onChange('activityLevel', v)} theme={theme} />
      </Field>

      <Field label="Primary Goal" theme={theme}>
        <ChipPicker options={GOAL_LABELS} value={form.primaryGoal} onChange={(v) => onChange('primaryGoal', v)} theme={theme} />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  field: { flex: 1, minWidth: 120, gap: spacing[1] },
  label: { fontSize: typography.sizes.sm, fontWeight: '500' },
  input: {
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    fontSize: typography.sizes.base,
  },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  segment: { flex: 1, textAlign: 'center', paddingVertical: spacing[2], fontSize: typography.sizes.sm, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    fontSize: typography.sizes.sm, fontWeight: '500',
  },
});
