import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Linking, TouchableOpacity, Platform, ImageBackground } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius, colors } from '../theme';
import * as db from '../services/database';
import Card from '../components/Card';
import MuscleTag from '../components/MuscleTag';
import { getExerciseVideo } from '../data/exercise-videos';

const { width: SCREEN_W } = Dimensions.get('window');

function YouTubeEmbed({ videoId }) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?mute=1`;

  if (Platform.OS === 'web') {
    return (
      <iframe
        src={embedUrl}
        style={{
          width: '100%',
          aspectRatio: '9/16',
          border: 'none',
          borderRadius: 10,
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // For native, would use react-native-webview here
  return null;
}

function MiniLineChart({ data, color, height = 60 }) {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const range = max - min;
  const w = SCREEN_W - spacing[4] * 2 - spacing[4] * 2;
  const stepX = w / (data.length - 1);

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ height }}>
      {/* Simple SVG-like using React Native views — approximated with dots */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 0 }}>
        {values.map((v, i) => {
          const h = Math.max(((v - min) / range) * height, 2);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: color,
                opacity: i === values.length - 1 ? 1 : 0.6,
                borderRadius: 2,
                marginHorizontal: 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function ExerciseDetailScreen({ route }) {
  const { exerciseId } = route.params;
  const { theme } = useTheme();
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ex, hist] = await Promise.all([
      db.getExerciseById(exerciseId),
      db.getExerciseHistory(exerciseId, 20),
    ]);
    setExercise(ex);
    setHistory(hist.reverse()); // oldest first for chart
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [exerciseId]));

  if (loading) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.accent} /></View>;
  }

  if (!exercise) return null;

  const bestWeight = history.length ? Math.max(...history.map((h) => h.max_weight || 0)) : null;
  const totalVolume = history.reduce((sum, h) => sum + (h.total_volume || 0), 0);
  const totalSessions = history.length;
  const video = getExerciseVideo(exercise.name);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise info */}
        <Card>
          <Text style={[styles.exName, { color: theme.text }]}>{exercise.name}</Text>
          <View style={styles.tagRow}>
            <MuscleTag group={exercise.muscle_group} />
            <View style={[styles.catBadge, { backgroundColor: theme.input, borderColor: theme.border }]}>
              <Text style={[styles.catBadgeText, { color: theme.textSecondary }]}>{exercise.category}</Text>
            </View>
          </View>
          {exercise.instructions ? (
            <Text style={[styles.instructions, { color: theme.textSecondary }]}>{exercise.instructions}</Text>
          ) : null}
        </Card>

        {/* Video Tutorial */}
        {video && (
          <Card>
            <View style={styles.videoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Tutorial Video</Text>
                <Text style={[styles.videoSubtitle, { color: theme.textMuted }]}>@atppersonaltraining4506</Text>
              </View>
              {!showVideo && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(video.url)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {showVideo ? (
              <View style={styles.videoContainer}>
                <YouTubeEmbed videoId={video.videoId} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.videoThumbnailWrapper}
                onPress={() => setShowVideo(true)}
                activeOpacity={0.8}
              >
                <ImageBackground
                  source={{ uri: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg` }}
                  style={[styles.videoThumbnail, { backgroundColor: theme.input }]}
                  imageStyle={styles.thumbnailImage}
                >
                  <View style={styles.thumbnailOverlay}>
                    <View style={[styles.playButton, { backgroundColor: theme.accent }]}>
                      <Ionicons name="play" size={32} color="#000" />
                    </View>
                    <Text style={[styles.tapToPlay, { color: '#fff' }]}>Tap to play</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Best Weight', value: bestWeight ? `${bestWeight} kg` : '—' },
            { label: 'Sessions', value: totalSessions || '—' },
            { label: 'Total Volume', value: totalVolume ? `${Math.round(totalVolume)} kg` : '—' },
          ].map((s) => (
            <Card key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Strength chart */}
        {history.length > 1 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Strength Progress</Text>
            <MiniLineChart
              data={history.map((h) => ({ value: h.max_weight || 0 }))}
              color={theme.accent}
              height={70}
            />
            <View style={styles.chartLabels}>
              <Text style={[styles.chartLabel, { color: theme.textMuted }]}>{formatDate(history[0]?.date)}</Text>
              <Text style={[styles.chartLabel, { color: theme.textMuted }]}>{formatDate(history[history.length - 1]?.date)}</Text>
            </View>
          </Card>
        )}

        {/* Session history */}
        {history.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Session History</Text>
            {[...history].reverse().slice(0, 10).map((h, i) => (
              <View
                key={i}
                style={[styles.historyRow, { borderTopColor: theme.border, borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <Text style={[styles.historyDate, { color: theme.textSecondary }]}>{formatDate(h.date)}</Text>
                <Text style={[styles.historyWeight, { color: theme.text }]}>
                  {h.max_weight ? `${h.max_weight} kg` : '—'}
                </Text>
                <Text style={[styles.historySets, { color: theme.textMuted }]}>{h.total_sets} sets</Text>
                <Text style={[styles.historyVol, { color: theme.textMuted }]}>
                  {h.total_volume ? `${Math.round(h.total_volume)} kg` : ''}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No history yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Add this exercise to a program and start logging.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing[4], gap: spacing[3] },
  exName: { fontSize: typography.sizes['2xl'], fontWeight: '700', marginBottom: spacing[2] },
  tagRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  catBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: typography.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  instructions: { fontSize: typography.sizes.base, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.xl, fontWeight: '700' },
  statLabel: { fontSize: typography.sizes.xs, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: '700', marginBottom: spacing[3] },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1] },
  chartLabel: { fontSize: typography.sizes.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  historyDate: { flex: 1, fontSize: typography.sizes.sm },
  historyWeight: { width: 70, fontSize: typography.sizes.base, fontWeight: '600', textAlign: 'right' },
  historySets: { width: 50, fontSize: typography.sizes.sm, textAlign: 'right' },
  historyVol: { width: 60, fontSize: typography.sizes.xs, textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingVertical: spacing[8] },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', marginTop: spacing[2] },
  emptyText: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: spacing[1] },
  videoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  videoSubtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  videoContainer: { width: '100%', aspectRatio: 9 / 16, borderRadius: radius.md, overflow: 'hidden' },
  videoThumbnailWrapper: { borderRadius: radius.md, overflow: 'hidden' },
  videoThumbnail: { width: '100%', aspectRatio: 9 / 16 },
  thumbnailImage: { borderRadius: radius.md },
  thumbnailOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  playButton: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8 },
  tapToPlay: { fontSize: typography.sizes.sm, fontWeight: '500', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
