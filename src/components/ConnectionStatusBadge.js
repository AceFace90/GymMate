import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';

export default function ConnectionStatusBadge({ status }) {
  const { theme } = useTheme();

  const config = {
    pending: {
      label: 'Pending',
      icon: 'time-outline',
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
    accepted: {
      label: 'Connected',
      icon: 'checkmark-circle',
      color: theme.accent,
      bgColor: theme.accentBg,
    },
    revoked: {
      label: 'Disconnected',
      icon: 'close-circle',
      color: '#ef4444',
      bgColor: '#fee2e2',
    },
  };

  const { label, icon, color, bgColor } = config[status] || config.pending;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
