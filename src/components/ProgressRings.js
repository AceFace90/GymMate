import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography } from '../theme';

/**
 * Apple Watch-style progress rings
 * @param {number} workouts - Current workouts this week
 * @param {number} workoutGoal - Target workouts per week
 * @param {number} sets - Current sets this week
 * @param {number} setGoal - Target sets per week
 * @param {number} streak - Current workout streak (days)
 */
export default function ProgressRings({ workouts = 0, workoutGoal = 4, sets = 0, setGoal = 60, streak = 0 }) {
  const { theme } = useTheme();

  // Calculate percentages (cap at 100%)
  const workoutPercent = Math.min((workouts / workoutGoal) * 100, 100);
  const setPercent = Math.min((sets / setGoal) * 100, 100);
  const streakPercent = Math.min((streak / 7) * 100, 100); // 7-day streak = 100%

  const size = 140;
  const strokeWidth = 12;
  const center = size / 2;

  // Ring radii (inner ring is smallest)
  const outerRadius = center - strokeWidth / 2 - 2;
  const middleRadius = outerRadius - strokeWidth - 4;
  const innerRadius = middleRadius - strokeWidth - 4;

  const circumference = (radius) => 2 * Math.PI * radius;

  const Ring = ({ radius, percent, color, opacity = 1 }) => {
    const circ = circumference(radius);
    const strokeDashoffset = circ - (circ * percent) / 100;

    return (
      <>
        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.15}
        />
        {/* Progress ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          opacity={opacity}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Rings */}
      <View style={styles.ringsContainer}>
        <Svg width={size} height={size}>
          {/* Workout ring (outer, green) */}
          <Ring radius={outerRadius} percent={workoutPercent} color="#10b981" />

          {/* Sets ring (middle, blue) */}
          <Ring radius={middleRadius} percent={setPercent} color="#3b82f6" />

          {/* Streak ring (inner, orange) */}
          <Ring radius={innerRadius} percent={streakPercent} color="#f97316" />
        </Svg>

        {/* Center label */}
        <View style={styles.centerLabel}>
          <Text style={[styles.centerNumber, { color: theme.text }]}>
            {workouts}
          </Text>
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>
            of {workoutGoal}
          </Text>
        </View>
      </View>

      {/* Stats below rings */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {workouts}/{workoutGoal}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Workouts
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {sets}/{setGoal}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Sets
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#f97316' }]} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            🔥 {streak}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Day Streak
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[4],
  },
  ringsContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerNumber: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '800',
  },
  centerText: {
    fontSize: typography.sizes.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[6],
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.sizes.xs,
  },
});
