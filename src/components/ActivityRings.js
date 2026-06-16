import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '../hooks/useTheme';
import { typography, spacing } from '../theme';

// Concentric progress rings (Apple/Fitbit style), driven by GymMate's weekly data.
// `rings` = [{ label, value, goal, color, unit }] ordered outer → inner.
export default function ActivityRings({ rings, size = 180, stroke = 14, gap = 6 }) {
  const { theme } = useTheme();
  const center = size / 2;
  const outerR = center - stroke / 2;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {rings.map((r, i) => {
            const radius = outerR - i * (stroke + gap);
            if (radius <= 0) return null;
            const circ = 2 * Math.PI * radius;
            const pct = Math.min(1, (r.value || 0) / (r.goal || 1));
            return (
              <G key={r.label}>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={theme.isDark ? '#404040' : '#e5e7eb'}
                  strokeWidth={stroke}
                  fill="none"
                />
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={r.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                />
              </G>
            );
          })}
        </G>
      </Svg>

      <View style={styles.legend}>
        {rings.map((r) => {
          const pct = Math.round(Math.min(1, (r.value || 0) / (r.goal || 1)) * 100);
          return (
            <View key={r.label} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>{r.label}</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {r.value}
                  <Text style={[styles.sub, { color: theme.textMuted }]}>
                    {' '}/ {r.goal}{r.unit ? ` ${r.unit}` : ''} · {pct}%
                  </Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[5], flexWrap: 'wrap' },
  legend: { gap: spacing[3], flex: 1, minWidth: 130 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dot: { width: 12, height: 12, borderRadius: 99 },
  label: { fontSize: typography.sizes.xs },
  value: { fontSize: typography.sizes.base, fontWeight: '700' },
  sub: { fontSize: typography.sizes.xs, fontWeight: '400' },
});
