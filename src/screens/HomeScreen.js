import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius, colors } from '../theme';
import * as db from '../services/database';
import { nsKey } from '../services/activeUser';
import { GOAL_LABELS } from '../utils/biometrics';
import Card from '../components/Card';
import Button from '../components/Button';
import ActivityRings from '../components/ActivityRings';

const PROFILE_KEY = 'gymmate_biometrics';

// Ring colours — neon green leads (brand), then blue + amber accents
const RING_COLORS = { workouts: '#39ff14', sets: '#38bdf8', minutes: '#fbbf24' };

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
  const [dailyActivity, setDailyActivity] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);

  const load = async () => {
    setLoading(true);
    const [raw, active, daily, recent] = await Promise.all([
      AsyncStorage.getItem(nsKey(PROFILE_KEY)),
      db.getActiveProgram(),
      db.getDailyActivity(14), // Get 14 days for this week vs last week comparison
      db.getRecentSessions(5),
    ]);
    console.log('[HomeScreen] Profile key:', nsKey(PROFILE_KEY));
    console.log('[HomeScreen] Raw profile data:', raw);
    const parsedProfile = raw ? JSON.parse(raw) : null;
    console.log('[HomeScreen] Parsed profile:', parsedProfile);
    console.log('[HomeScreen] User prop:', user);
    setProfile(parsedProfile);
    setActiveProgram(active);
    setDailyActivity(daily);
    setRecentSessions(recent);

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

  // ── This-week dashboard data ────────────────────────────────────────────
  const dayMap = Object.fromEntries(dailyActivity.map((d) => [d.date, d]));

  // Build the last 7 days, oldest → newest, with zero-fill
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    const entry = dayMap[key] || { sessions: 0, total_sets: 0, total_volume: 0 };
    last7.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      sessions: entry.sessions || 0,
      sets: entry.total_sets || 0,
      volume: entry.total_volume || 0,
    });
  }

  // Sum a window of N days ending `offset` days ago (offset 0 = current 7 days)
  const sumWindow = (startDaysAgo, endDaysAgo) => {
    let sessions = 0, sets = 0, volume = 0, minutes = 0;
    for (let i = startDaysAgo - 1; i >= endDaysAgo; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const e = dayMap[isoDay(d)];
      if (e) { sessions += e.sessions || 0; sets += e.total_sets || 0; volume += e.total_volume || 0; }
    }
    // training minutes from sessions in window
    recentSessions.forEach((s) => {
      if (!s.duration_seconds) return;
      const diffDays = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 86400000);
      if (diffDays >= endDaysAgo && diffDays < startDaysAgo) minutes += s.duration_seconds / 60;
    });
    return { sessions, sets, volume, minutes: Math.round(minutes) };
  };

  const thisWeekCalc = sumWindow(7, 0);
  const lastWeek = sumWindow(14, 7);

  // % change vs last week; null when there's no prior baseline
  const delta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

  const weeklyGoal = activeProgram?.days_per_week || 3;

  const rings = [
    { label: 'Workouts', value: thisWeekCalc.sessions, goal: weeklyGoal, color: RING_COLORS.workouts, unit: '' },
    { label: 'Sets', value: thisWeekCalc.sets, goal: Math.max(weeklyGoal * 18, 1), color: RING_COLORS.sets, unit: '' },
    { label: 'Minutes', value: thisWeekCalc.minutes, goal: Math.max(weeklyGoal * 45, 1), color: RING_COLORS.minutes, unit: 'min' },
  ];

  const maxDaySets = Math.max(...last7.map((d) => d.sets), 1);

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

        {/* This Week — Activity Rings */}
        <Card>
          <View style={styles.cardHead}>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>THIS WEEK</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              {thisWeekCalc.sessions} of {weeklyGoal} workouts
            </Text>
          </View>
          <View style={styles.ringsCenter}>
            <ActivityRings rings={rings} />
          </View>
        </Card>

        {/* Delta stat cards — this week vs last */}
        <View style={styles.statsRow}>
          {[
            { label: 'Workouts', value: thisWeekCalc.sessions, d: delta(thisWeekCalc.sessions, lastWeek.sessions) },
            { label: 'Sets', value: thisWeekCalc.sets, d: delta(thisWeekCalc.sets, lastWeek.sets) },
            { label: 'Volume', value: thisWeekCalc.volume >= 1000 ? `${(thisWeekCalc.volume / 1000).toFixed(1)}t` : `${Math.round(thisWeekCalc.volume)}`, d: delta(thisWeekCalc.volume, lastWeek.volume) },
          ].map((stat) => {
            const up = stat.d != null && stat.d >= 0;
            return (
              <Card key={stat.label} style={styles.statCard}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                {stat.d != null ? (
                  <View style={styles.deltaRow}>
                    <Ionicons
                      name={up ? 'arrow-up' : 'arrow-down'}
                      size={11}
                      color={up ? theme.accent : colors.red}
                    />
                    <Text style={[styles.deltaText, { color: up ? theme.accent : colors.red }]}>
                      {Math.abs(stat.d)}%
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.deltaText, { color: theme.textMuted, marginTop: 2 }]}>—</Text>
                )}
              </Card>
            );
          })}
        </View>

        {/* 7-day intensity heatmap */}
        <TouchableOpacity onPress={() => navigation.navigate('Progress')} activeOpacity={0.8}>
          <Card>
            <View style={styles.cardHead}>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>LAST 7 DAYS</Text>
              <Text style={[styles.viewMore, { color: theme.accent }]}>View Full Progress →</Text>
            </View>
            <View style={styles.heat}>
              {last7.map((d) => {
                const intensity = d.sets / maxDaySets;
                const cellColor =
                  d.sets === 0 ? theme.border :
                  intensity >= 0.8 ? theme.accent :
                  intensity >= 0.5 ? (theme.isDark ? 'rgba(57,255,20,0.6)' : 'rgba(22,163,74,0.6)') :
                  (theme.isDark ? 'rgba(57,255,20,0.3)' : 'rgba(22,163,74,0.3)');
                return (
                  <View key={d.key} style={styles.heatCol}>
                    <View style={[styles.heatCell, { backgroundColor: cellColor }]}>
                      {d.sets > 0 ? (
                        <Text style={[styles.heatVal, { color: intensity >= 0.8 && theme.isDark ? '#1a1a1a' : theme.text }]}>
                          {d.sets}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.heatDay, { color: theme.textMuted }]}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
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
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  cardSub: { fontSize: typography.sizes.xs },
  ringsCenter: { alignItems: 'center', justifyContent: 'center' },
  viewMore: { fontSize: typography.sizes.xs, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes['2xl'], fontWeight: '700' },
  statLabel: { fontSize: typography.sizes.xs, marginTop: 2 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing[1] },
  deltaText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  heat: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  heatCol: { flex: 1, alignItems: 'center', gap: spacing[2] },
  heatCell: { width: '100%', height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  heatVal: { fontSize: typography.sizes.sm, fontWeight: '700' },
  heatDay: { fontSize: typography.sizes.xs },
  lastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[2] },
  lastName: { fontSize: typography.sizes.base, fontWeight: '700' },
  badge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2 },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
});
