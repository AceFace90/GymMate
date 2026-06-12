import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import Card from '../components/Card';
import Button from '../components/Button';
import UniversalFields from '../components/biometrics/UniversalFields';
import CycleTracker from '../components/biometrics/CycleTracker';
import PregnancyProfile from '../components/biometrics/PregnancyProfile';
import { calcBMI, bmiCategory, calcTDEE } from '../utils/biometrics';
import { nsKey } from '../services/activeUser';

const PROFILE_KEY = 'gymmate_biometrics';

const EMPTY_PROFILE = {
  name: '', age: '', sex: '',
  heightCm: '', weightKg: '', bodyFatPct: '',
  activityLevel: '', primaryGoal: '',
  isPregnant: false, trimester: '', cycleLastPeriodDate: '', cycleLength: 28,
};

export default function BiometricsScreen({ navigation }) {
  const { theme } = useTheme();
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(nsKey(PROFILE_KEY)).then((raw) => {
      if (raw) setForm({ ...EMPTY_PROFILE, ...JSON.parse(raw) });
    });
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    await AsyncStorage.setItem(nsKey(PROFILE_KEY), JSON.stringify(form));
    setSaved(true);
    setTimeout(() => { if (navigation?.canGoBack()) navigation.goBack(); }, 800);
  }

  const bmi = calcBMI(form.weightKg, form.heightCm);
  const tdee = calcTDEE(form.weightKg, form.heightCm, form.age, form.sex, form.activityLevel);
  const isFemale = form.sex === 'female';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Your Profile</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
            Your data stays on this device. We use it to personalise your training guidance.
          </Text>
        </View>

        {/* Main fields */}
        <Card>
          <UniversalFields form={form} onChange={handleChange} />
        </Card>

        {/* Live metrics */}
        {(bmi || tdee) && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Calculated Metrics</Text>
            <View style={styles.metricsRow}>
              {bmi && (
                <View style={[styles.metricChip, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[styles.metricValue, { color: theme.accent }]}>{bmi}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>BMI — {bmiCategory(bmi)}</Text>
                </View>
              )}
              {tdee && (
                <View style={[styles.metricChip, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[styles.metricValue, { color: theme.accent }]}>{tdee.toLocaleString()} kcal</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                    Est. daily need
                    {form.primaryGoal === 'fat_loss' ? '\n(−300–500 for deficit)' : ''}
                    {form.primaryGoal === 'muscle_gain' ? '\n(+200–300 for surplus)' : ''}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Female-specific */}
        {isFemale && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Reproductive Health</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Helps us tailor workouts and recovery advice throughout the month.
            </Text>

            {/* Pregnant toggle */}
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Currently pregnant?</Text>
              <View style={styles.toggleBtns}>
                {[true, false].map((v) => (
                  <TouchableOpacity
                    key={String(v)}
                    onPress={() => handleChange('isPregnant', v)}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: form.isPregnant === v ? theme.accentBg : theme.input,
                        borderColor: form.isPregnant === v ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.toggleBtnText, { color: form.isPregnant === v ? theme.accent : theme.textSecondary }]}>
                      {v ? 'Yes' : 'No'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.isPregnant
              ? <PregnancyProfile form={form} onChange={handleChange} />
              : <CycleTracker form={form} onChange={handleChange} />
            }
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            onPress={handleSave}
            style={saved ? { backgroundColor: '#16a34a' } : undefined}
          >
            {saved ? '✓ Saved!' : 'Save Profile'}
          </Button>
          {navigation?.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3] },
  pageHeader: { gap: spacing[1], marginBottom: spacing[2] },
  pageTitle: { fontSize: typography.sizes['2xl'], fontWeight: '800' },
  pageSubtitle: { fontSize: typography.sizes.sm, lineHeight: 20 },
  sectionTitle: { fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing[3] },
  sectionDesc: { fontSize: typography.sizes.sm, marginBottom: spacing[3] },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  metricChip: { flex: 1, minWidth: 120, borderWidth: 1, borderRadius: radius.lg, padding: spacing[3], alignItems: 'center', gap: spacing[1] },
  metricValue: { fontSize: typography.sizes.lg, fontWeight: '700' },
  metricLabel: { fontSize: typography.sizes.xs, textAlign: 'center', lineHeight: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  toggleLabel: { fontSize: typography.sizes.base, fontWeight: '500' },
  toggleBtns: { flexDirection: 'row', gap: spacing[2] },
  toggleBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1 },
  toggleBtnText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  actions: { gap: spacing[2], marginTop: spacing[2] },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  cancelText: { fontSize: typography.sizes.base },
});
