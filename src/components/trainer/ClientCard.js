import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../Card';
import { spacing, typography, radius } from '../../theme';

export default function ClientCard({ client, onPress }) {
  const { theme } = useTheme();

  // Calculate adherence percentage (workouts this week vs expected)
  const adherencePercent = client.weeklyWorkouts && client.expectedWorkouts
    ? Math.round((client.weeklyWorkouts / client.expectedWorkouts) * 100)
    : 0;

  const adherenceColor = adherencePercent >= 80 ? theme.accent :
                          adherencePercent >= 50 ? '#f59e0b' :
                          '#ef4444';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {/* Client Photo/Avatar */}
          <View style={styles.avatarContainer}>
            {client.photo_url ? (
              <Image source={{ uri: client.photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.accentBg }]}>
                <Ionicons name="person" size={24} color={theme.accent} />
              </View>
            )}
          </View>

          {/* Client Info */}
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {client.clientName || client.name || 'Client'}
            </Text>

            {/* Last Workout */}
            {client.lastWorkoutDate ? (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Last workout: {formatDate(client.lastWorkoutDate)}
              </Text>
            ) : (
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                No workouts logged yet
              </Text>
            )}

            {/* Weekly Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="barbell-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {client.weeklyWorkouts || 0} workouts
                </Text>
              </View>

              <View style={[styles.adherenceBadge, { backgroundColor: adherenceColor + '20' }]}>
                <Text style={[styles.adherenceText, { color: adherenceColor }]}>
                  {adherencePercent}% adherence
                </Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  meta: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.xs,
  },
  adherenceBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  adherenceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
