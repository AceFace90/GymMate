import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { confirmAction } from '../utils/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import Card from '../components/Card';
import { nsKey } from '../services/activeUser';
import { auth as fbAuth } from '../services/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../services/firebase';

function Row({ label, value, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.row, { borderBottomColor: theme.border }]}
    >
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation, onLogout }) {
  const { theme } = useTheme();

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>My Profile</Text>
        <Card noPad>
          <Row
            label="Biometrics & Goals"
            onPress={() => navigation.navigate('Biometrics')}
            theme={theme}
          />
        </Card>

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
  sectionHeader: {
    fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: spacing[2], marginBottom: spacing[1], marginLeft: spacing[1],
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: typography.sizes.base },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  rowValue: { fontSize: typography.sizes.sm },
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
  footer: { textAlign: 'center', fontSize: typography.sizes.sm, marginTop: spacing[4], marginBottom: spacing[2] },
});
