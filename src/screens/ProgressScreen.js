import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { spacing, typography, radius, colors } from '../theme';
import * as db from '../services/database';
import * as auth from '../services/auth';
import * as workoutSync from '../services/workoutSync';
import Card from '../components/Card';
import MuscleTag from '../components/MuscleTag';
import ActivityRings from '../components/ActivityRings';
import { confirmAction } from '../utils/confirm';

// Ring colours — neon green leads (brand), then blue + amber accents
const RING_COLORS = { workouts: '#39ff14', sets: '#38bdf8', minutes: '#fbbf24' };

// ISO date (YYYY-MM-DD) for a Date in local time
function isoDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing[4] * 2 - spacing[4] * 2; // card padding both sides

function SimpleBarChart({ data, color, height = 80 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(Math.floor((CHART_W - data.length * 3) / data.length), 4);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 3, overflow: 'hidden' }}>
      {data.map((d, i) => (
        <View key={i} style={{ alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: '100%',
              height: Math.max((d.value / max) * height, 2),
              backgroundColor: color,
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
        </View>
      ))}
    </View>
  );
}

const TABS = ['Overview', 'History', 'Records'];

export default function ProgressScreen({ navigation }) {
  const { theme } = useTheme();
  const { weightUnit, kgToLbs, units, formatWeight } = useUnits();
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  const [weeklyVolume, setWeeklyVolume] = useState([]);
  const [muscleVolume, setMuscleVolume] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wv, mv, sessions, prs, daily, active] = await Promise.all([
        db.getWeeklyVolume(12),
        db.getMuscleGroupVolume(30),
        db.getRecentSessions(20),
        db.getPersonalRecords(),
        db.getDailyActivity(14),
        db.getActiveProgram(),
      ]);
      setWeeklyVolume(wv);
      setMuscleVolume(mv);
      setRecentSessions(sessions);
      setPersonalRecords(prs);
      setDailyActivity(daily);
      setWeeklyGoal(active?.days_per_week || 3);
    } catch (error) {
      console.error('[ProgressScreen] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.round(secs / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  const handleDeleteSession = (session) => {
    confirmAction({
      title: 'Delete Workout',
      message: `Delete "${session.day_name || 'Workout'}" from ${formatDate(session.started_at)}? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await db.deleteSession(session.id);
        const fbUser = auth.getFirebaseUser();
        if (fbUser?.uid) workoutSync.deleteCloudSession(fbUser.uid, session.id).catch(() => {});
        loadData();
      },
    });
  };

  const handleResetPR = (pr) => {
    confirmAction({
      title: 'Reset PR',
      message: `Reset all PR markers for "${pr.name}"? Your workout history will remain, but this exercise will no longer show as a record.`,
      confirmText: 'Reset',
      destructive: true,
      onConfirm: async () => { await db.resetPRsForExercise(pr.id); loadData(); },
    });
  };

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

  const thisWeek = sumWindow(7, 0);
  const lastWeek = sumWindow(14, 7);

  // % change vs last week; null when there's no prior baseline
  const delta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

  const rings = [
    { label: 'Workouts', value: thisWeek.sessions, goal: weeklyGoal, color: RING_COLORS.workouts, unit: '' },
    { label: 'Sets', value: thisWeek.sets, goal: Math.max(weeklyGoal * 18, 1), color: RING_COLORS.sets, unit: '' },
    { label: 'Minutes', value: thisWeek.minutes, goal: Math.max(weeklyGoal * 45, 1), color: RING_COLORS.minutes, unit: 'min' },
  ];

  const maxDaySets = Math.max(...last7.map((d) => d.sets), 1);

  const MUSCLE_COLORS = {
    chest: colors.chest, back: colors.back, legs: colors.legs,
    shoulders: colors.shoulders, arms: colors.arms, core: colors.core,
    cardio: colors.cardio, full_body: colors.fullBody,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: tab === t ? theme.accent : theme.textSecondary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[10] }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── OVERVIEW TAB ───────────────────────────────────────── */}
          {tab === 'Overview' && (
            <>
              {/* This week — activity rings */}
              <Card>
                <View style={styles.cardHead}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>This Week</Text>
                  <Text style={[styles.cardSub, { color: theme.textMuted }]}>
                    {thisWeek.sessions} of {weeklyGoal} workouts
                  </Text>
                </View>
                <ActivityRings rings={rings} />
              </Card>

              {/* Delta stat cards — this week vs last */}
              <View style={styles.statsRow}>
                {[
                  { label: 'Workouts', value: thisWeek.sessions, d: delta(thisWeek.sessions, lastWeek.sessions) },
                  { label: 'Sets', value: thisWeek.sets, d: delta(thisWeek.sets, lastWeek.sets) },
                  { label: 'Volume', value: thisWeek.volume >= 1000 ? `${(thisWeek.volume / 1000).toFixed(1)}t` : `${Math.round(thisWeek.volume)}`, d: delta(thisWeek.volume, lastWeek.volume) },
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
              <Card>
                <View style={styles.cardHead}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Last 7 Days</Text>
                  <Text style={[styles.cardSub, { color: theme.textMuted }]}>Sets per day</Text>
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

              {/* Weekly volume chart */}
              <Card>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Volume ({weightUnit})</Text>
                {weeklyVolume.length > 0 ? (
                  <>
                    <SimpleBarChart
                      data={weeklyVolume.map((w) => ({
                        value: units === 'imperial' ? kgToLbs(w.total_volume || 0) : (w.total_volume || 0)
                      }))}
                      color={theme.accent}
                      height={80}
                    />
                    <View style={[styles.chartLabels]}>
                      <Text style={[styles.chartLabel, { color: theme.textMuted }]}>
                        {weeklyVolume[0]?.week?.replace('W', 'wk')}
                      </Text>
                      <Text style={[styles.chartLabel, { color: theme.textMuted }]}>
                        {weeklyVolume[weeklyVolume.length - 1]?.week?.replace('W', 'wk')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={[styles.emptyChart, { color: theme.textMuted }]}>Complete workouts to see volume trends</Text>
                )}
              </Card>

              {/* Muscle group breakdown */}
              <Card>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Muscle Breakdown (30 days)</Text>
                {muscleVolume.length > 0 ? (
                  muscleVolume.map((m) => {
                    const maxSets = muscleVolume[0].total_sets || 1;
                    const pct = (m.total_sets / maxSets) * 100;
                    const color = MUSCLE_COLORS[m.muscle_group] || theme.accent;
                    return (
                      <View key={m.muscle_group} style={styles.muscleRow}>
                        <Text style={[styles.muscleLabel, { color: theme.text }]} numberOfLines={1}>
                          {m.muscle_group?.replace('_', ' ')}
                        </Text>
                        <View style={[styles.muscleBarBg, { backgroundColor: theme.border }]}>
                          <View style={[styles.muscleBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.muscleCount, { color: theme.textSecondary }]}>{m.total_sets}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.emptyChart, { color: theme.textMuted }]}>No data yet for the last 30 days</Text>
                )}
              </Card>
            </>
          )}

          {/* ── HISTORY TAB ────────────────────────────────────────── */}
          {tab === 'History' && (
            <>
              {recentSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48 }}>📋</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No sessions yet</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Your completed workouts will appear here.</Text>
                </View>
              ) : (
                recentSessions.map((session) => (
                  <View key={session.id} style={{ position: 'relative' }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('WorkoutDetail', { sessionId: session.id })}
                      activeOpacity={0.7}
                    >
                      <Card style={styles.sessionCard}>
                        <View style={styles.sessionHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.sessionDay, { color: theme.text }]}>{session.day_name || 'Workout'}</Text>
                            <Text style={[styles.sessionDate, { color: theme.textSecondary }]}>{formatDate(session.started_at)}</Text>
                          </View>
                          <View style={styles.sessionStats}>
                            <View style={[styles.sessionBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                              <Text style={[styles.sessionBadgeText, { color: theme.accent }]}>{session.total_sets} sets</Text>
                            </View>
                            <Text style={[styles.sessionDuration, { color: theme.textMuted }]}>{formatDuration(session.duration_seconds)}</Text>
                          </View>
                          <View style={{ width: 32 }} />
                        </View>
                        {session.notes ? (
                          <Text style={[styles.sessionNotes, { color: theme.textSecondary }]} numberOfLines={2}>{session.notes}</Text>
                        ) : null}
                      </Card>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        handleDeleteSession(session);
                      }}
                      style={{ position: 'absolute', top: spacing[4] + 4, right: spacing[4] + 4, zIndex: 10 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {/* ── RECORDS TAB ────────────────────────────────────────── */}
          {tab === 'Records' && (
            <>
              {personalRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48 }}>🏆</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No records yet</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Log some workouts and your PRs will appear here.</Text>
                </View>
              ) : (
                personalRecords.map((pr) => (
                  <Card key={pr.id} style={styles.prCard}>
                    <View style={styles.prRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prName, { color: theme.text }]}>{pr.name}</Text>
                        <MuscleTag group={pr.muscle_group} style={{ marginTop: 2 }} />
                      </View>
                      <View style={styles.prWeightCol}>
                        <Text style={[styles.prWeight, { color: theme.accent }]}>
                          {pr.best_weight ? formatWeight(pr.best_weight) : '—'}
                        </Text>
                        {pr.reps_at_best ? (
                          <Text style={[styles.prReps, { color: theme.textSecondary }]}>× {pr.reps_at_best}</Text>
                        ) : null}
                        <Text style={[styles.prDate, { color: theme.textMuted }]}>{formatDate(pr.achieved_at)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleResetPR(pr)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: spacing[1], paddingTop: spacing[3] },
  tab: { flex: 1, paddingVertical: spacing[3], alignItems: 'center' },
  tabText: { fontSize: typography.sizes.base, fontWeight: '600' },
  content: { padding: spacing[4], gap: spacing[3] },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes['2xl'], fontWeight: '700' },
  statLabel: { fontSize: typography.sizes.xs, marginTop: 2 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing[1] },
  deltaText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  cardSub: { fontSize: typography.sizes.xs },
  heat: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  heatCol: { flex: 1, alignItems: 'center', gap: spacing[2] },
  heatCell: { width: '100%', height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  heatVal: { fontSize: typography.sizes.sm, fontWeight: '700' },
  heatDay: { fontSize: typography.sizes.xs },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700', marginBottom: spacing[3] },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1] },
  chartLabel: { fontSize: typography.sizes.xs },
  emptyChart: { fontSize: typography.sizes.sm, textAlign: 'center', paddingVertical: spacing[4] },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  muscleLabel: { width: 80, fontSize: typography.sizes.sm, textTransform: 'capitalize' },
  muscleBarBg: { flex: 1, height: 8, borderRadius: radius.full, overflow: 'hidden' },
  muscleBarFill: { height: '100%', borderRadius: radius.full },
  muscleCount: { width: 28, fontSize: typography.sizes.xs, textAlign: 'right' },
  sessionCard: {},
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deleteBtn: { padding: spacing[1] },
  sessionDay: { fontSize: typography.sizes.base, fontWeight: '700' },
  sessionDate: { fontSize: typography.sizes.sm, marginTop: 2 },
  sessionStats: { alignItems: 'flex-end', gap: spacing[1] },
  sessionBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2 },
  sessionBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  sessionDuration: { fontSize: typography.sizes.xs },
  sessionNotes: { fontSize: typography.sizes.sm, marginTop: spacing[2] },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing[12] },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[3] },
  emptyText: { fontSize: typography.sizes.base, textAlign: 'center', marginTop: spacing[2] },
  prCard: {},
  prRow: { flexDirection: 'row', alignItems: 'center' },
  prName: { fontSize: typography.sizes.base, fontWeight: '600' },
  prWeightCol: { alignItems: 'flex-end' },
  prWeight: { fontSize: typography.sizes.lg, fontWeight: '700' },
  prReps: { fontSize: typography.sizes.sm },
  prDate: { fontSize: typography.sizes.xs, marginTop: 2 },
});
