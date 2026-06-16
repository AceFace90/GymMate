import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import { spacing, typography } from '../../theme';

export default function ClientWorkoutDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { workout, client } = route.params;

  // Group sets by exercise
  const exerciseGroups = {};
  workout.sets.forEach((set) => {
    if (!exerciseGroups[set.exerciseName]) {
      exerciseGroups[set.exerciseName] = [];
    }
    exerciseGroups[set.exerciseName].push(set);
  });

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.clientName, { color: theme.textSecondary }]}>
            {client.clientName}
          </Text>
        </View>

        {/* Workout Info */}
        <Card style={styles.infoCard}>
          <Text style={[styles.workoutTitle, { color: theme.text }]}>
            {workout.dayName}
          </Text>
          <Text style={[styles.workoutDate, { color: theme.textSecondary }]}>
            {formatDate(workout.completedAt)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>
                {formatDuration(workout.durationSeconds)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="barbell-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>
                {workout.completedSets} sets
              </Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trophy-outline" size={20} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.text }]}>
                {workout.prCount} PRs
              </Text>
            </View>
          </View>

          {workout.notes && (
            <View style={[styles.notesBox, { backgroundColor: theme.bgSecondary }]}>
              <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>
                Notes:
              </Text>
              <Text style={[styles.notesText, { color: theme.text }]}>
                {workout.notes}
              </Text>
            </View>
          )}
        </Card>

        {/* Exercises */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Exercises
        </Text>

        {Object.entries(exerciseGroups).map(([exerciseName, sets]) => (
          <Card key={exerciseName} style={styles.exerciseCard}>
            <Text style={[styles.exerciseName, { color: theme.text }]}>
              {exerciseName}
            </Text>

            <View style={styles.setsTable}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.setNumHeader, { color: theme.textSecondary }]}>
                  Set
                </Text>
                <Text style={[styles.weightHeader, { color: theme.textSecondary }]}>
                  Weight (kg)
                </Text>
                <Text style={[styles.repsHeader, { color: theme.textSecondary }]}>
                  Reps
                </Text>
                <Text style={[styles.rpeHeader, { color: theme.textSecondary }]}>
                  RPE
                </Text>
              </View>

              {/* Table Rows */}
              {sets.map((set, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={styles.setNumCol}>
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {set.setNumber}
                    </Text>
                    {set.isPR && (
                      <Ionicons name="trophy" size={12} color={theme.accent} style={styles.prIcon} />
                    )}
                  </View>
                  <Text style={[styles.cellText, { color: theme.text, flex: 1 }]}>
                    {set.weightKg ? set.weightKg.toFixed(1) : '-'}
                  </Text>
                  <Text style={[styles.cellText, { color: theme.text, flex: 1 }]}>
                    {set.reps || '-'}
                  </Text>
                  <Text style={[styles.cellText, { color: theme.text, flex: 1 }]}>
                    {set.rpe || '-'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  clientName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  infoCard: {
    marginBottom: spacing[4],
  },
  workoutTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
  },
  workoutDate: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  statBox: {
    alignItems: 'center',
    gap: spacing[2],
  },
  statText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  notesBox: {
    padding: spacing[3],
    borderRadius: spacing[2],
    marginTop: spacing[3],
  },
  notesLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: typography.sizes.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[3],
  },
  exerciseCard: {
    marginBottom: spacing[3],
  },
  exerciseName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[3],
  },
  setsTable: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  tableHeader: {
    borderBottomWidth: 1,
    marginBottom: spacing[2],
  },
  setNumHeader: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  weightHeader: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  repsHeader: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  rpeHeader: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  setNumCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  cellText: {
    fontSize: typography.sizes.sm,
  },
  prIcon: {
    marginLeft: spacing[1],
  },
});
