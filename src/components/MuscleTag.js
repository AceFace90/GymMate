import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

const GROUP_COLORS = {
  chest:     colors.chest,
  back:      colors.back,
  legs:      colors.legs,
  shoulders: colors.shoulders,
  arms:      colors.arms,
  core:      colors.core,
  cardio:    colors.cardio,
  full_body: colors.fullBody,
};

export default function MuscleTag({ group, style }) {
  const color = GROUP_COLORS[group] || '#6b7280';
  const label = group?.replace('_', ' ') ?? '';
  return (
    <View style={[styles.tag, { backgroundColor: color + '22', borderColor: color + '55' }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
