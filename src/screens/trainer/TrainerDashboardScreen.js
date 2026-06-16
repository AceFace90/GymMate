import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import ClientCard from '../../components/trainer/ClientCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography } from '../../theme';
import * as trainerClient from '../../services/trainerClient';
import * as auth from '../../services/auth';
import * as workoutSync from '../../services/workoutSync';
import * as programTemplates from '../../services/programTemplates';

export default function TrainerDashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadClients();
    }, [])
  );

  async function loadClients() {
    try {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const relationships = await trainerClient.getMyClients(user.id);

      // Fetch real workout stats for each client
      const clientsWithStats = await Promise.all(relationships.map(async (rel) => {
        try {
          // Strip google- prefix if present
          const firebaseUid = rel.clientId?.replace('google-', '');

          // Get this week's workouts
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 7);

          const weekWorkouts = await workoutSync.getClientWorkoutsInRange(firebaseUid, startOfWeek, endOfWeek);

          // Get assigned programs to calculate expected workouts
          const assignments = await programTemplates.getClientAssignmentsByTrainer(user.id, rel.clientId);
          let expectedWorkouts = 0;
          assignments.forEach(assignment => {
            expectedWorkouts += assignment.programData?.daysPerWeek || 0;
          });

          // Get overall stats for last workout date
          const stats = await workoutSync.getClientWorkoutStats(firebaseUid);

          return {
            ...rel,
            weeklyWorkouts: weekWorkouts.length,
            expectedWorkouts: expectedWorkouts || 3, // Default to 3 if no program assigned
            lastWorkoutDate: stats.lastWorkout,
          };
        } catch (error) {
          console.error(`Failed to load stats for client ${rel.clientId}:`, error);
          return {
            ...rel,
            weeklyWorkouts: 0,
            expectedWorkouts: 3,
            lastWorkoutDate: null,
          };
        }
      }));

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  }

  function handleClientPress(client) {
    navigation.navigate('ClientDetail', { client });
  }

  function handleConnectClient() {
    navigation.navigate('Connection');
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: theme.textSecondary }}>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>My Clients</Text>
          <TouchableOpacity onPress={handleConnectClient}>
            <Ionicons name="person-add" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        {clients.length > 0 && (
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accent }]}>
                  {clients.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Active Clients
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accent }]}>
                  {clients.reduce((sum, c) => sum + (c.weeklyWorkouts || 0), 0)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Workouts This Week
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accent }]}>
                  {clients.length > 0
                    ? Math.round(
                        clients.reduce((sum, c) => {
                          const adherence = c.expectedWorkouts > 0
                            ? (c.weeklyWorkouts / c.expectedWorkouts) * 100
                            : 0;
                          return sum + adherence;
                        }, 0) / clients.length
                      )
                    : 0}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Avg Adherence
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Clients List */}
        {clients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No clients yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Connect with clients by generating an invite code
            </Text>
            <Button
              title="Connect Client"
              onPress={handleConnectClient}
              style={{ marginTop: spacing[4] }}
            />
          </Card>
        ) : (
          <View style={styles.clientsList}>
            {clients.map((client) => (
              <ClientCard
                key={client.relationshipId}
                client={client}
                onPress={() => handleClientPress(client)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB: Connect New Client */}
      {clients.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={handleConnectClient}
        >
          <Ionicons name="add" size={28} color={theme.isDark ? '#000' : '#fff'} />
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  statsCard: {
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
  },
  clientsList: {
    marginTop: spacing[2],
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
