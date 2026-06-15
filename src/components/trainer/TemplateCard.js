import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../Card';
import Button from '../Button';
import { spacing, typography } from '../../theme';

export default function TemplateCard({ template, onPress, onEdit, onAssign, onDelete }) {
  const { theme } = useTheme();

  const exerciseCount = template.programData?.days?.reduce((sum, day) => {
    return sum + (day.exercises?.length || 0);
  }, 0) || 0;

  const dayCount = template.programData?.days?.length || template.daysPerWeek || 0;

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="clipboard-outline" size={20} color={theme.accent} />
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {template.name}
            </Text>
          </View>

          {template.description ? (
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
              {template.description}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>
                {dayCount} days/week
              </Text>
            </View>

            <View style={styles.stat}>
              <Ionicons name="barbell-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.statText, { color: theme.textSecondary }]}>
                {exerciseCount} exercises
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="create-outline" size={18} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.accent }]}>Edit</Text>
          </TouchableOpacity>
        )}

        {onAssign && (
          <TouchableOpacity onPress={onAssign} style={styles.actionBtn}>
            <Ionicons name="person-add-outline" size={18} color={theme.accent} />
            <Text style={[styles.actionText, { color: theme.accent }]}>Assign</Text>
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
    padding: 0,
  },
  header: {
    padding: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    flex: 1,
  },
  description: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.xs,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    gap: spacing[2],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
