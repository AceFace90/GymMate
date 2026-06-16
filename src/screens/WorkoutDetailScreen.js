import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { spacing, typography, radius } from '../theme';
import * as db from '../services/database';
import Card from '../components/Card';

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function WorkoutDetailScreen({ route }) {
  const { theme } = useTheme();
  const { formatWeight } = useUnits();
  const sessionId = route?.params?.sessionId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const s = await db.getSessionById(sessionId);
        if (active) {
          setSession(s);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [sessionId])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[10] }} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>🤷</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Workout not found</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            This session may have been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group sets by exercise, preserving first-seen order
  const sets = session.sets || [];
  const exerciseGroups = [];
  const groupIndex = {};
  sets.forEach((set) => {
    if (groupIndex[set.exercise_name] === undefined) {
      groupIndex[set.exercise_name] = exerciseGroups.length;
      exerciseGroups.push({ name: set.exercise_name, sets: [] });
    }
    exerciseGroups[groupIndex[set.exercise_name]].sets.push(set);
  });

  const completedSets = sets.filter((s) => s.completed).length;
  const prCount = sets.filter((s) => s.is_pr).length;
  const totalVolume = sets.reduce(
    (sum, s) => sum + (s.completed && s.weight_kg && s.reps ? s.weight_kg * s.reps : 0),
    0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout summary */}
        <Card style={styles.infoCard}>
          <Text style={[styles.workoutTitle, { color: theme.text }]}>
            {session.day_name || 'Workout'}
          </Text>
          <Text style={[styles.workoutDate, { color: theme.textSecondary }]}>
            {formatDate(session.started_at)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>
                {formatDuration(session.duration_seconds)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="barbell-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>{completedSets} sets</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trending-up-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}`}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trophy-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>{prCount} PRs</Text>
            </View>
          </View>

          {session.notes ? (
            <View style={[styles.notesBox, { backgroundColor: theme.bgSecondary || theme.card }]}>
              <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.text }]}>{session.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Exercises */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Exercises</Text>

        {exerciseGroups.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No sets were logged for this workout.
            </Text>
          </Card>
        ) : (
          exerciseGroups.map((group) => (
            <Card key={group.name} style={styles.exerciseCard}>
              <Text style={[styles.exerciseName, { color: theme.text }]}>{group.name}</Text>

              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.cellHeader, styles.setCol, { color: theme.textSecondary }]}>Set</Text>
                <Text style={[styles.cellHeader, styles.dataCol, { color: theme.textSecondary }]}>Weight</Text>
                <Text style={[styles.cellHeader, styles.dataCol, { color: theme.textSecondary }]}>Reps</Text>
                <Text style={[styles.cellHeader, styles.dataCol, { color: theme.textSecondary }]}>RPE</Text>
              </View>

              {group.sets.map((set) => (
                <View key={set.id} style={styles.tableRow}>
                  <View style={[styles.setCol, styles.setNumCell]}>
                    <Text style={[styles.cellText, { color: theme.text }]}>{set.set_number}</Text>
                    {set.is_pr ? (
                      <Ionicons name="trophy" size={12} color={theme.accent} />
                    ) : null}
                  </View>
                  <Text style={[styles.cellText, styles.dataCol, { color: theme.text }]}>
                    {set.weight_kg ? formatWeight(set.weight_kg) : '—'}
                  </Text>
                  <Text style={[styles.cellText, styles.dataCol, { color: theme.text }]}>
                    {set.reps || '—'}
                  </Text>
                  <Text style={[styles.cellText, styles.dataCol, { color: theme.text }]}>
                    {set.rpe || '—'}
                  </Text>
                </View>
              ))}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[3] },
  infoCard: {},
  workoutTitle: { fontSize: typography.sizes['2xl'], fontWeight: '700', marginBottom: spacing[1] },
  workoutDate: { fontSize: typography.sizes.sm, marginBottom: spacing[4] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: spacing[2] },
  statText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  notesBox: { padding: spacing[3], borderRadius: radius.md, marginTop: spacing[4] },
  notesLabel: { fontSize: typography.sizes.xs, fontWeight: '700', marginBottom: spacing[1], textTransform: 'uppercase' },
  notesText: { fontSize: typography.sizes.sm },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: '700', marginTop: spacing[2] },
  exerciseCard: {},
  exerciseName: { fontSize: typography.sizes.base, fontWeight: '700', marginBottom: spacing[3] },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  tableHeader: { borderBottomWidth: 1, marginBottom: spacing[1] },
  cellHeader: { fontSize: typography.sizes.xs, fontWeight: '700' },
  cellText: { fontSize: typography.sizes.sm },
  setCol: { width: 56 },
  dataCol: { flex: 1, textAlign: 'center' },
  setNumCell: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing[12] },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[3] },
  emptyText: { fontSize: typography.sizes.base, textAlign: 'center', marginTop: spacing[2] },
});
