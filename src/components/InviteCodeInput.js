import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';

export default function InviteCodeInput({ value, onChangeText, isValid, errorMessage }) {
  const { theme } = useTheme();
  const inputRef = useRef(null);

  const handleChange = (text) => {
    // Auto-capitalize and limit to 6 characters
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    onChangeText(cleaned);
  };

  const borderColor = isValid === true ? theme.accent :
                       isValid === false ? '#ef4444' :
                       theme.border;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        placeholder="ABC123"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            borderColor,
            color: theme.text,
          },
        ]}
      />

      {/* Validation Feedback */}
      {isValid === true && (
        <Text style={[styles.feedback, { color: theme.accent }]}>
          ✓ Valid code
        </Text>
      )}

      {isValid === false && errorMessage && (
        <Text style={[styles.feedback, { color: '#ef4444' }]}>
          {errorMessage}
        </Text>
      )}

      {/* Helper Text */}
      {isValid === null && (
        <Text style={[styles.helper, { color: theme.textMuted }]}>
          Enter the 6-character code from your trainer
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 2,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  feedback: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  helper: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[2],
    textAlign: 'center',
  },
});
