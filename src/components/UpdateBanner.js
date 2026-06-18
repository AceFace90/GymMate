import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import { useVersionCheck, reloadForUpdate } from '../hooks/useVersionCheck';

// Floating "new version" prompt. Renders nothing until the deployed build
// differs from the running one; tapping reloads to pick up the new bundle.
export default function UpdateBanner() {
  const { theme } = useTheme();
  const updateAvailable = useVersionCheck();

  if (!updateAvailable) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <TouchableOpacity
        onPress={reloadForUpdate}
        activeOpacity={0.85}
        style={[styles.banner, { backgroundColor: theme.accent }]}
      >
        <Ionicons name="cloud-download-outline" size={18} color="#1a1a1a" />
        <Text style={styles.text}>New version available — tap to refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: spacing[4], alignItems: 'center', zIndex: 1000 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.full,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  text: { color: '#1a1a1a', fontSize: typography.sizes.sm, fontWeight: '700' },
});
