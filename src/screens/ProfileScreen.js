import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { confirmAction } from '../utils/confirm';
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
import { auth as fbAuth } from '../services/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../services/firebase';
import * as auth from '../services/auth';
import * as trainerClient from '../services/trainerClient';

const PROFILE_KEY = 'gymmate_biometrics';

const EMPTY_PROFILE = {
  name: '', age: '', sex: '',
  heightCm: '', weightKg: '', bodyFatPct: '',
  activityLevel: '', primaryGoal: '',
  isPregnant: false, trimester: '', cycleLastPeriodDate: '', cycleLength: 28,
};

export default function ProfileScreen({ navigation, onLogout }) {
  const { theme } = useTheme();
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loadingTrainer, setLoadingTrainer] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(nsKey(PROFILE_KEY)).then((raw) => {
      if (raw) setForm({ ...EMPTY_PROFILE, ...JSON.parse(raw) });
    });
    loadTrainerConnection();
  }, []);

  async function loadTrainerConnection() {
    try {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        setLoadingTrainer(false);
        return;
      }

      const trainerConnection = await trainerClient.getMyTrainer(user.id);
      setTrainer(trainerConnection);
    } catch (error) {
      console.error('Failed to load trainer:', error);
    } finally {
      setLoadingTrainer(false);
    }
  }

  async function handleDisconnectTrainer() {
    if (!trainer) return;

    confirmAction({
      title: 'Disconnect Trainer',
      message: `Disconnect from ${trainer.trainerName}? They will no longer see your workouts or progress.`,
      confirmText: 'Disconnect',
      destructive: true,
      onConfirm: async () => {
        try {
          await trainerClient.revokeConnection(trainer.relationshipId, currentUser.id);
          setTrainer(null);
          alert('Disconnected from trainer');
        } catch (error) {
          console.error('Failed to disconnect:', error);
          alert('Failed to disconnect');
        }
      },
    });
  }

  async function handleToggleTrainerRole() {
    const newRole = currentUser?.role === 'trainer' ? null : 'trainer';
    try {
      await auth.updateUserRole(currentUser.id, newRole);
      const updatedUser = await auth.getCurrentUser();
      setCurrentUser(updatedUser);

      // Force app to reload to update navigation tabs
      alert(newRole === 'trainer'
        ? 'Trainer mode enabled! Refreshing app...'
        : 'Trainer mode disabled! Refreshing app...'
      );
      window.location.reload();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update trainer mode. Please try again.');
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    await AsyncStorage.setItem(nsKey(PROFILE_KEY), JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function confirmLogout() {
    confirmAction({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      destructive: true,
      onConfirm: onLogout,
    });
  }

  async function handleWipeData() {
    confirmAction({
      title: 'Wipe All Data',
      message: 'Delete ALL your workout data, programs, exercises, and biometrics from this device and the cloud? This is permanent and cannot be undone.',
      confirmText: 'Wipe Everything',
      destructive: true,
      onConfirm: async () => {
        try {
          // Clear all local namespaced data
          const dataKeys = [
            'gymmate_exercises', 'gymmate_programs', 'gymmate_programDays',
            'gymmate_programExercises', 'gymmate_sessions', 'gymmate_sessionSets',
            'gymmate_counters', 'gymmate_biometrics', 'gymmate_last_sync',
          ];
          for (const key of dataKeys) {
            try { localStorage.removeItem(nsKey(key)); } catch {}
          }

          // For Google users, delete cloud backup doc
          const uid = fbAuth.currentUser?.uid;
          if (uid) {
            try {
              await deleteDoc(doc(firestore, 'users', uid));
            } catch (e) {
              console.error('Cloud delete failed (local data still wiped):', e);
            }
          }

          alert('All data wiped. Restart the app or log out to continue.');
        } catch (e) {
          alert('Data wipe failed: ' + e.message);
        }
      },
    });
  }

  const bmi = calcBMI(form.weightKg, form.heightCm);
  const tdee = calcTDEE(form.weightKg, form.heightCm, form.age, form.sex, form.activityLevel);
  const isFemale = form.sex === 'female';

  // Only show metrics if they're valid numbers
  const validBMI = bmi && !isNaN(bmi) && isFinite(bmi);
  const validTDEE = tdee && !isNaN(tdee) && isFinite(tdee);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {currentUser?.google_id
            ? 'Your workouts are backed up to the cloud and visible to your trainer (if connected).'
            : 'Your data stays on this device. Sign in with Google to sync across devices and enable trainer features.'}
        </Text>

        {/* Main biometrics fields */}
        <Card>
          <UniversalFields form={form} onChange={handleChange} />
        </Card>

        {/* Live metrics */}
        {(validBMI || validTDEE) && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Calculated Metrics</Text>
            <View style={styles.metricsRow}>
              {validBMI && (
                <View style={[styles.metricChip, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[styles.metricValue, { color: theme.accent }]}>{bmi}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>BMI — {bmiCategory(bmi)}</Text>
                </View>
              )}
              {validTDEE && (
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

        {/* Save button */}
        <Button
          onPress={handleSave}
          style={saved ? { backgroundColor: '#16a34a' } : undefined}
        >
          {saved ? '✓ Profile Saved!' : 'Save Profile'}
        </Button>

        {/* Trainer Connection */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Trainer Connection</Text>
        <Card>
          {!loadingTrainer && trainer ? (
            <>
              <View style={styles.trainerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trainerLabel, { color: theme.textSecondary }]}>
                    Connected to:
                  </Text>
                  <Text style={[styles.trainerName, { color: theme.text }]}>
                    {trainer.trainerName}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
              </View>
              <Button
                title="Disconnect"
                variant="secondary"
                onPress={handleDisconnectTrainer}
                style={{ marginTop: spacing[3] }}
              />
            </>
          ) : (
            <>
              <Text style={[styles.noTrainerText, { color: theme.textSecondary }]}>
                Not connected to a trainer
              </Text>
              <Button
                title="Connect with Trainer"
                variant="secondary"
                onPress={() => navigation.navigate('ConnectTrainer')}
                style={{ marginTop: spacing[3] }}
              />
            </>
          )}
        </Card>

        {/* Trainer Role Toggle */}
        {currentUser && (
          <>
            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Account Type</Text>
            <Card>
              <View style={styles.roleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: theme.text }]}>
                    I am a trainer
                  </Text>
                  <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>
                    Enable trainer features to manage clients
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleTrainerRole}
                  style={[
                    styles.switch,
                    {
                      backgroundColor: currentUser.role === 'trainer' ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      {
                        backgroundColor: theme.isDark ? '#000' : '#fff',
                        transform: [{ translateX: currentUser.role === 'trainer' ? 20 : 0 }],
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Tips</Text>
        <Card>
          {[
            { icon: '💪', tip: 'Log sets with weight + reps to track your PRs automatically.' },
            { icon: '📈', tip: 'Check the Progress tab after each session to see your trends.' },
            { icon: '🎯', tip: 'Create programs with multiple days to stay consistent.' },
            { icon: '⏱️', tip: "The rest timer vibrates when it's time to start your next set." },
          ].map((t, i) => (
            <View
              key={i}
              style={[styles.tipRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{t.tip}</Text>
            </View>
          ))}
        </Card>

        <TouchableOpacity
          onPress={confirmLogout}
          style={[styles.logoutBtn, { borderColor: '#ef4444' }]}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleWipeData}
          style={[styles.wipeBtn, { borderColor: '#991b1b', backgroundColor: '#450a0a' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="warning" size={16} color="#ef4444" style={{ marginRight: spacing[2] }} />
          <Text style={styles.wipeText}>Wipe All My Data</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Made with 💚 to complement{' '}
            <Text
              style={[styles.footerLink, { color: theme.accent }]}
              onPress={() => Linking.openURL('https://macromate-xcu1.onrender.com/')}
            >
              MacroMate
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: typography.sizes.sm, lineHeight: 20, marginBottom: spacing[2] },
  sectionHeader: {
    fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: spacing[2], marginBottom: spacing[1], marginLeft: spacing[1],
  },
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
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], paddingVertical: spacing[2] },
  tipText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 20 },
  logoutBtn: {
    borderWidth: 1, borderRadius: radius.lg,
    paddingVertical: spacing[4], alignItems: 'center',
    marginTop: spacing[4],
  },
  logoutText: { color: '#ef4444', fontSize: typography.sizes.base, fontWeight: '600' },
  wipeBtn: {
    borderWidth: 1, borderRadius: radius.lg,
    paddingVertical: spacing[4], alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
    marginTop: spacing[3],
  },
  wipeText: { color: '#ef4444', fontSize: typography.sizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { alignItems: 'center', marginTop: spacing[4], marginBottom: spacing[2] },
  footerText: { fontSize: typography.sizes.sm, textAlign: 'center' },
  footerLink: { fontWeight: '600' },
  trainerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  trainerLabel: { fontSize: typography.sizes.xs, marginBottom: spacing[1] },
  trainerName: { fontSize: typography.sizes.lg, fontWeight: '600' },
  noTrainerText: { fontSize: typography.sizes.sm, marginBottom: spacing[2] },
  roleRow: { flexDirection: 'row', alignItems: 'center' },
  roleLabel: { fontSize: typography.sizes.base, fontWeight: '600', marginBottom: spacing[1] },
  roleDesc: { fontSize: typography.sizes.sm },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
