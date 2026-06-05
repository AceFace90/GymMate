import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import Card from '../components/Card';

const THEME_OPTIONS = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light',  label: 'Light',  icon: 'sunny-outline' },
  { key: 'dark',   label: 'Dark',   icon: 'moon-outline' },
];

function Row({ icon, label, value, onPress, children, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !children}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.row, { borderBottomColor: theme.border }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.input }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text> : null}
        {children}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme, preference, setTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App header */}
        <View style={styles.appHeader}>
          <View style={[styles.logo, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
            <Text style={{ fontSize: 32 }}>🏋️</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>GymMate</Text>
          <Text style={[styles.appTagline, { color: theme.accent }]}>Track. Progress. Dominate.</Text>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Appearance</Text>
        <Card noPad>
          <View style={[styles.themeSelector, { borderBottomColor: theme.border }]}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setTheme(opt.key)}
                style={[
                  styles.themeOption,
                  preference === opt.key && { backgroundColor: theme.accentBg, borderColor: theme.accentBorder },
                  { borderColor: preference === opt.key ? theme.accentBorder : 'transparent' },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={preference === opt.key ? theme.accent : theme.textMuted}
                />
                <Text style={[styles.themeLabel, { color: preference === opt.key ? theme.accent : theme.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Units */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>About</Text>
        <Card noPad>
          <Row
            icon="information-circle-outline"
            label="Version"
            value="1.0.0"
            theme={theme}
          />
          <Row
            icon="barbell-outline"
            label="Exercises"
            value="80+ built-in"
            theme={theme}
          />
          <Row
            icon="heart-outline"
            label="Companion App"
            value="MacroMate"
            theme={theme}
          />
        </Card>

        {/* Tips */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Tips</Text>
        <Card>
          {[
            { icon: '💪', tip: 'Log sets with weight + reps to track your PRs automatically.' },
            { icon: '📈', tip: 'Check the Progress tab after each session to see your trends.' },
            { icon: '🎯', tip: 'Create programs with multiple days to stay consistent.' },
            { icon: '⏱️', tip: 'The rest timer vibrates when it\'s time to start your next set.' },
          ].map((t, i) => (
            <View key={i} style={[styles.tipRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{t.tip}</Text>
            </View>
          ))}
        </Card>

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          Made with 💚 to complement MacroMate
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[2] },
  appHeader: { alignItems: 'center', paddingVertical: spacing[4], marginBottom: spacing[2] },
  logo: { width: 72, height: 72, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  appName: { fontSize: typography.sizes['3xl'], fontWeight: '800' },
  appTagline: { fontSize: typography.sizes.base, fontWeight: '600', marginTop: 2 },
  sectionHeader: { fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing[2], marginBottom: spacing[1], marginLeft: spacing[1] },
  themeSelector: { flexDirection: 'row', padding: spacing[2], gap: spacing[2] },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radius.md, borderWidth: 1 },
  themeLabel: { fontSize: typography.sizes.xs, fontWeight: '600', marginTop: spacing[1] },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  rowLabel: { flex: 1, fontSize: typography.sizes.base },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  rowValue: { fontSize: typography.sizes.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], paddingVertical: spacing[2] },
  tipText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 20 },
  footer: { textAlign: 'center', fontSize: typography.sizes.sm, marginTop: spacing[4], marginBottom: spacing[2] },
});
