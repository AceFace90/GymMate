import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';

// Cross-platform date picker component
// Web: Uses native <input type="date">
// Native: Could use DateTimePicker (future enhancement)
export default function DatePicker({ value, onChange, label, placeholder, style }) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Format date for display: YYYY-MM-DD or empty
  const displayValue = value || '';

  const handleDateChange = (newDate) => {
    onChange(newDate);
    setShowPicker(false);
  };

  if (Platform.OS === 'web') {
    // Web: Use native HTML5 date input
    return (
      <View style={[styles.container, style]}>
        {label && (
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        )}
        <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <input
            type="date"
            value={displayValue}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder={placeholder || 'YYYY-MM-DD'}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: theme.text,
              fontSize: typography.sizes.base,
              fontFamily: 'inherit',
              padding: 0,
              outline: 'none',
            }}
          />
          <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
        </View>
      </View>
    );
  }

  // Native: For now, use text input with calendar icon (can enhance later with DateTimePicker)
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}
        onPress={() => {
          // TODO: Show native DateTimePicker modal
          alert('Date picker coming soon for native apps. For now, enter date as YYYY-MM-DD');
        }}
      >
        <Text style={{ color: displayValue ? theme.text : theme.textMuted, flex: 1 }}>
          {displayValue || placeholder || 'YYYY-MM-DD'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[1],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
});
