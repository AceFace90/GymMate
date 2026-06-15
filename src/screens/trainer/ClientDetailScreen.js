import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import { spacing, typography } from '../../theme';
import * as trainerClient from '../../services/trainerClient';

export default function ClientDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { client } = route.params;
  const [loading, setLoading] = useState(false);

  async function handleRevokeConnection() {
    Alert.alert(
      'Disconnect Client',
      `Are you sure you want to disconnect from ${client.clientName}? They will no longer be able to see programs you assign, and you won't see their progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await trainerClient.revokeConnection(client.relationshipId, client.trainerId);
              Alert.alert('Disconnected', 'Client has been disconnected');
              navigation.goBack();
            } catch (error) {
              console.error('Failed to revoke connection:', error);
              Alert.alert('Error', 'Failed to disconnect client');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

        {/* Stats Placeholder */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            This Week
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                {client.weeklyWorkouts || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Workouts
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                --
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Sets
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>
                --
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Volume (kg)
              </Text>
            </View>
          </View>
        </Card>

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

function formatDate(dateString) {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
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
});
