import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import { spacing, typography } from '../../theme';
import * as trainerClient from '../../services/trainerClient';
import * as programTemplates from '../../services/programTemplates';
import * as workoutSync from '../../services/workoutSync';
import * as db from '../../services/database';

export default function ClientDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { client } = route.params;
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [workoutStats, setWorkoutStats] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadAssignments();
      loadWorkouts();
    }, [client.clientId])
  );

  async function loadAssignments() {
    try {
      // Get assignments for this trainer-client pair
      const allAssignments = await programTemplates.getClientAssignmentsByTrainer(client.trainerId, client.clientId);
      console.log('[ClientDetailScreen] Assignments for client:', allAssignments);
      setAssignments(allAssignments);
    } catch (error) {
      console.error('[ClientDetailScreen] Failed to load assignments:', error);
    }
  }

  async function loadWorkouts() {
    try {
      console.log('[ClientDetailScreen] Querying workouts for clientId:', client.clientId);

      // Strip google- prefix if present (workout uploads use Firebase UID without prefix)
      const firebaseUid = client.clientId?.replace('google-', '');
      console.log('[ClientDetailScreen] Using Firebase UID:', firebaseUid);

      // Get recent workouts for this client
      const recentWorkouts = await workoutSync.getClientWorkouts(firebaseUid, 10);
      console.log('[ClientDetailScreen] Workouts for client:', recentWorkouts);
      setWorkouts(recentWorkouts);

      // Get workout stats
      const stats = await workoutSync.getClientWorkoutStats(firebaseUid);
      console.log('[ClientDetailScreen] Workout stats:', stats);
      setWorkoutStats(stats);
    } catch (error) {
      console.error('[ClientDetailScreen] Failed to load workouts:', error);

      // Check if it's an index error
      if (error.message?.includes('index')) {
        console.log('[ClientDetailScreen] Firestore index is still building. This can take 2-5 minutes after deployment.');
        console.log('[ClientDetailScreen] Check status at: https://console.firebase.google.com/project/gymmate-ef56f/firestore/indexes');
      }

      // Set empty data so UI doesn't break
      setWorkouts([]);
      setWorkoutStats({ totalWorkouts: 0, totalSets: 0, totalPRs: 0, avgDuration: 0, lastWorkout: null });
    }
  }

  async function handleRemoveAssignment(assignment) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Remove "${assignment.programData?.name || 'this program'}" from ${client.clientName}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Remove Assignment',
            `Remove "${assignment.programData?.name || 'this program'}" from ${client.clientName}?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      setLoading(true);
      await programTemplates.removeAssignment(assignment.assignmentId);

      if (Platform.OS === 'web') {
        alert('Program unassigned successfully');
      }

      await loadAssignments(); // Reload
    } catch (error) {
      console.error('[ClientDetailScreen] Failed to remove assignment:', error);
      if (Platform.OS === 'web') {
        alert(`Error: Failed to remove assignment\n\n${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to remove assignment');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeConnection() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Disconnect from ${client.clientName}?\n\nThey will no longer be able to see programs you assign, and you won't see their progress.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Disconnect Client',
            `Are you sure you want to disconnect from ${client.clientName}? They will no longer be able to see programs you assign, and you won't see their progress.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Disconnect', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      setLoading(true);
      await trainerClient.revokeConnection(client.relationshipId, client.trainerId);

      if (Platform.OS === 'web') {
        alert('Client disconnected successfully');
      } else {
        Alert.alert('Disconnected', 'Client has been disconnected');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to revoke connection:', error);
      if (Platform.OS === 'web') {
        alert(`Error: Failed to disconnect client\n\n${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to disconnect client');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAssignProgram() {
    navigation.navigate('AssignProgram', { client });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ConnectionStatusBadge status="accepted" />
        </View>

        {/* Client Info */}
        <Card style={styles.infoCard}>
          <Text style={[styles.clientName, { color: theme.text }]}>
            {client.clientName || 'Client'}
          </Text>
          <Text style={[styles.clientEmail, { color: theme.textSecondary }]}>
            Connected {formatDate(client.acceptedAt)}
          </Text>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Button
            title="Assign Program"
            onPress={handleAssignProgram}
            style={{ flex: 1 }}
          />
        </View>

        {/* Assigned Programs */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing[4], marginBottom: spacing[3] }]}>
          Assigned Programs
        </Text>
        {assignments.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No programs assigned yet
            </Text>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.assignmentId} style={styles.assignmentCard}>
              <View style={styles.assignmentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assignmentName, { color: theme.text }]}>
                    {assignment.programData?.name || 'Unnamed Program'}
                  </Text>
                  <Text style={[styles.assignmentMeta, { color: theme.textSecondary }]}>
                    {assignment.assignmentType === 'linked' ? '🔗 Linked' : '📄 Custom'} • Assigned {formatDate(assignment.assignedAt)}
                  </Text>
                  {assignment.lastSyncedAt && (
                    <Text style={[styles.assignmentMeta, { color: theme.textMuted, fontSize: typography.sizes.xs }]}>
                      Last synced {formatDate(assignment.lastSyncedAt)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveAssignment(assignment)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Workout Stats */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing[4], marginBottom: spacing[3] }]}>
          Progress
        </Text>
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                {workoutStats?.totalWorkouts || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Workouts
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                {workoutStats?.totalSets || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Sets
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                {workoutStats?.totalPRs || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                PRs
              </Text>
            </View>
          </View>
          {workoutStats?.lastWorkout && (
            <Text style={[styles.lastWorkout, { color: theme.textMuted }]}>
              Last workout: {formatDate(workoutStats.lastWorkout)}
            </Text>
          )}
        </Card>

        {/* Recent Workouts */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing[4], marginBottom: spacing[3] }]}>
          Recent Workouts
        </Text>
        {workouts.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No workouts yet
            </Text>
          </Card>
        ) : (
          workouts.map((workout) => (
            <TouchableOpacity
              key={workout.sessionId}
              onPress={() => navigation.navigate('ClientWorkoutDetail', { workout, client })}
            >
              <Card style={styles.workoutCard}>
                <View style={styles.workoutRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>
                      {workout.dayName}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: theme.textSecondary }]}>
                      {formatDate(workout.completedAt)} • {Math.round(workout.durationSeconds / 60)} min • {workout.completedSets} sets
                    </Text>
                    {workout.prCount > 0 && (
                      <Text style={[styles.prBadge, { color: theme.accent }]}>
                        🎉 {workout.prCount} PR{workout.prCount > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Danger Zone */}
        <Card style={styles.dangerCard}>
          <Text style={[styles.dangerTitle, { color: '#ef4444' }]}>
            Danger Zone
          </Text>
          <Text style={[styles.dangerText, { color: theme.textSecondary }]}>
            Disconnecting will remove your access to this client's data
          </Text>
          <Button
            title="Disconnect Client"
            onPress={handleRevokeConnection}
            variant="danger"
            loading={loading}
            style={{ marginTop: spacing[3] }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateValue) {
  if (!dateValue) return 'recently';

  // Handle Firestore Timestamp objects
  let date;
  if (dateValue?.toDate) {
    date = dateValue.toDate(); // Firestore Timestamp
  } else if (dateValue?.seconds) {
    date = new Date(dateValue.seconds * 1000); // Timestamp object with seconds
  } else {
    date = new Date(dateValue); // Regular date string
  }

  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    marginBottom: spacing[4],
  },
  clientName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
  },
  clientEmail: {
    fontSize: typography.sizes.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statsCard: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.sizes.xs,
  },
  dangerCard: {
    marginBottom: spacing[4],
  },
  dangerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[2],
  },
  dangerText: {
    fontSize: typography.sizes.sm,
  },
  assignmentCard: {
    marginBottom: spacing[2],
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  assignmentName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  assignmentMeta: {
    fontSize: typography.sizes.sm,
  },
  removeBtn: {
    padding: spacing[2],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  workoutCard: {
    marginBottom: spacing[2],
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  workoutName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  workoutMeta: {
    fontSize: typography.sizes.sm,
  },
  prBadge: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  lastWorkout: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing[3],
  },
});
