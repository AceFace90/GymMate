import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import * as db from '../services/database';
import { nsKey } from '../services/activeUser';
import { GOAL_LABELS } from '../utils/biometrics';
import Card from '../components/Card';
import Button from '../components/Button';
import ProgressRings from '../components/ProgressRings';

const PROFILE_KEY = 'gymmate_biometrics';

function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation, user }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [thisWeek, setThisWeek] = useState({ sessions: 0, sets: 0 });
  const [lastSession, setLastSession] = useState(null);
  const [streak, setStreak] = useState(0);

  const load = async () => {
    setLoading(true);
    const [raw, active, daily, recent] = await Promise.all([
      AsyncStorage.getItem(nsKey(PROFILE_KEY)),
      db.getActiveProgram(),
      db.getDailyActivity(7),
      db.getRecentSessions(1),
    ]);
    setProfile(raw ? JSON.parse(raw) : null);
    setActiveProgram(active);

    // Sum the last 7 days
    const dayMap = Object.fromEntries(daily.map((d) => [d.date, d]));
    let sessions = 0, sets = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const e = dayMap[isoDay(d)];
      if (e) { sessions += e.sessions || 0; sets += e.total_sets || 0; }
    }
    setThisWeek({ sessions, sets });
    setLastSession(recent[0] || null);

    // Calculate streak (consecutive days with workouts)
    let currentStreak = 0;
    const today = isoDay(new Date());
    for (let i = 0; i < 365; i++) { // Check up to a year back
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = isoDay(d);
      const dayData = dayMap[dayKey];
      if (dayData && dayData.sessions > 0) {
        currentStreak++;
      } else if (dayKey !== today) {
        // Allow today to not have a workout yet, but break streak on any other day
        break;
      }
    }
    setStreak(currentStreak);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const firstName = (profile?.name || user?.name || 'there').split(' ')[0];
  const goalLabel = profile?.primaryGoal ? GOAL_LABELS[profile.primaryGoal] : null;

  const startActive = async () => {
    if (!activeProgram?.id) return;
    navigation.navigate('Programs', {
      screen: 'ProgramDetail',
      params: { programId: activeProgram.id, startWorkout: true },
    });
  };

  const quickWorkout = async () => {
    const sessionId = await db.startSession({ dayName: 'Quick Workout' });
    navigation.navigate('Programs', {
      screen: 'ActiveWorkout',
      params: { sessionId, programDay: null, programId: null, dayName: 'Quick Workout' },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[12] }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting()},</Text>
        <Text style={[styles.name, { color: theme.text }]}>{firstName} 👋</Text>
        {goalLabel ? (
          <Text style={[styles.goal, { color: theme.textSecondary }]}>
            Goal: <Text style={{ color: theme.accent, fontWeight: '700' }}>{goalLabel}</Text>
          </Text>
        ) : null}

        {/* Active program / today's workout */}
        <Card style={[styles.heroCard, { borderColor: theme.accentBorder }]}>
          <Text style={[styles.heroLabel, { color: theme.textMuted }]}>TODAY'S WORKOUT</Text>
          {activeProgram ? (
            <>
              <Text style={[styles.heroTitle, { color: theme.text }]}>{activeProgram.name}</Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                {activeProgram.days?.length || activeProgram.days_per_week} days · {activeProgram.days_per_week}×/week
              </Text>
              <Button title="▶  Start Workout" onPress={startActive} size="lg" style={{ marginTop: spacing[3] }} />
            </>
          ) : (
            <>
              <Text style={[styles.heroTitle, { color: theme.text }]}>No active program</Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                Activate a program or jump into a quick session.
              </Text>
              <Button
                title="Browse Programs"
                onPress={() => navigation.navigate('Programs')}
                size="lg"
                style={{ marginTop: spacing[3] }}
              />
            </>
          )}
          <TouchableOpacity onPress={quickWorkout} style={styles.quickLink} activeOpacity={0.7}>
            <Text style={[styles.quickLinkText, { color: theme.accent }]}>⚡ Quick Workout (no program)</Text>
          </TouchableOpacity>
        </Card>

        {/* Progress Rings */}
        <TouchableOpacity onPress={() => navigation.navigate('Progress')} activeOpacity={0.8}>
          <Card>
            <View style={styles.progressHeader}>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>CLOSE YOUR RINGS</Text>
              <Text style={[styles.viewMore, { color: theme.accent }]}>View Full Progress →</Text>
            </View>
            <ProgressRings
              workouts={thisWeek.sessions}
              workoutGoal={activeProgram?.days_per_week || 4}
              sets={thisWeek.sets}
              setGoal={60}
              streak={streak}
            />
          </Card>
        </TouchableOpacity>

        {/* Last session */}
        {lastSession ? (
          <TouchableOpacity onPress={() => navigation.navigate('Progress')} activeOpacity={0.8}>
            <Card>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>LAST SESSION</Text>
              <View style={styles.lastRow}>
                <Text style={[styles.lastName, { color: theme.text }]}>{lastSession.day_name || 'Workout'}</Text>
                <View style={[styles.badge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[styles.badgeText, { color: theme.accent }]}>{lastSession.total_sets} sets</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3] },
  greeting: { fontSize: typography.sizes.base, marginTop: spacing[2] },
  name: { fontSize: typography.sizes['3xl'], fontWeight: '800', marginTop: 2 },
  goal: { fontSize: typography.sizes.base, marginTop: spacing[1], marginBottom: spacing[2] },
  heroCard: { gap: 2 },
  heroLabel: { fontSize: typography.sizes.xs, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[1] },
  heroSub: { fontSize: typography.sizes.sm, marginTop: 2 },
  quickLink: { marginTop: spacing[3], alignItems: 'center' },
  quickLinkText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  viewMore: { fontSize: typography.sizes.xs, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing[4], justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.sizes['3xl'], fontWeight: '800' },
  statLabel: { fontSize: typography.sizes.xs, marginTop: 2, textAlign: 'center' },
  lastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2] },
  lastName: { fontSize: typography.sizes.base, fontWeight: '700' },
  badge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2 },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  gridItem: { width: '47.5%', flexGrow: 1 },
  gridCard: { gap: 2, minHeight: 110, justifyContent: 'center' },
  gridTitle: { fontSize: typography.sizes.base, fontWeight: '700', marginTop: spacing[1] },
  gridSub: { fontSize: typography.sizes.xs },
});
