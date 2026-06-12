import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, Vibration, Platform, FlatList, ActivityIndicator,
} from 'react-native';

// Vibration is not supported on web — safe no-op wrapper
const vibrate = (pattern) => {
  if (Platform.OS !== 'web') {
    try { Vibration.vibrate(pattern); } catch (_) {}
  }
};
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import * as db from '../services/database';
import Card from '../components/Card';
import Button from '../components/Button';
import MuscleTag from '../components/MuscleTag';

// Format seconds as M:SS
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen({ route, navigation }) {
  const { sessionId, programDay, programId, dayName } = route.params;
  const { theme } = useTheme();

  const [elapsed, setElapsed] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [exercises, setExercises] = useState([]);

  // sets[exerciseId] = [{ weight, reps, completed, isPR }]
  const [sets, setSets] = useState({});
  const [lastSets, setLastSets] = useState({});

  const [notes, setNotes] = useState('');
  const [showFinish, setShowFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Ad-hoc exercise picker (Quick Workout, or adding to any session)
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [pickerExercises, setPickerExercises] = useState([]);
  const [exSearch, setExSearch] = useState('');
  const [exLoading, setExLoading] = useState(false);

  const timerRef = useRef(null);
  const restRef = useRef(null);

  // Start elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Rest timer
  useEffect(() => {
    if (isResting && restTime > 0) {
      restRef.current = setInterval(() => {
        setRestTime((r) => {
          if (r <= 1) {
            clearInterval(restRef.current);
            setIsResting(false);
            vibrate([0, 300, 100, 300]);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restRef.current);
  }, [isResting]);

  // Load exercises from program day
  useEffect(() => {
    if (programDay?.exercises) {
      setExercises(programDay.exercises);
      const initialSets = {};
      const fetchLast = async () => {
        for (const ex of programDay.exercises) {
          initialSets[ex.exercise_id] = [{ weight: '', reps: '', completed: false, id: null }];
          const last = await db.getLastSetForExercise(ex.exercise_id);
          if (last) {
            setLastSets((prev) => ({ ...prev, [ex.exercise_id]: last }));
          }
        }
        setSets(initialSets);
      };
      fetchLast();
    }
  }, [programDay]);

  const addSet = (exerciseId) => {
    setSets((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] || []), { weight: '', reps: '', completed: false, id: null }],
    }));
  };

  const searchExercises = async (query) => {
    setExLoading(true);
    const results = await db.getExercises({ search: query || undefined });
    setPickerExercises(results);
    setExLoading(false);
  };

  const openAddExercise = () => {
    setExSearch('');
    searchExercises('');
    setShowAddExercise(true);
  };

  // Add an exercise to the live session. `ex` is a DB exercise row
  // ({ id, name, muscle_group, category }); map it to the program-exercise
  // shape the rest of this screen renders against.
  const handleAddExercise = async (ex) => {
    if (exercises.some((e) => e.exercise_id === ex.id)) {
      setShowAddExercise(false);
      return;
    }
    const entry = {
      id: `adhoc-${ex.id}`,
      exercise_id: ex.id,
      exercise_name: ex.name,
      muscle_group: ex.muscle_group,
      sets: null,
      reps: null,
      rest_seconds: 90,
    };
    setExercises((prev) => [...prev, entry]);
    setSets((prev) => ({
      ...prev,
      [ex.id]: [{ weight: '', reps: '', completed: false, id: null }],
    }));
    const last = await db.getLastSetForExercise(ex.id);
    if (last) setLastSets((prev) => ({ ...prev, [ex.id]: last }));
    setShowAddExercise(false);
  };

  const updateSet = (exerciseId, setIndex, field, value) => {
    setSets((prev) => {
      const updated = [...(prev[exerciseId] || [])];
      updated[setIndex] = { ...updated[setIndex], [field]: value };
      return { ...prev, [exerciseId]: updated };
    });
  };

  const completeSet = async (exercise, setIndex) => {
    const setData = sets[exercise.exercise_id]?.[setIndex];
    if (!setData) return;
    const w = parseFloat(setData.weight) || null;
    const r = parseInt(setData.reps) || null;
    const result = await db.logSet({
      sessionId,
      exerciseId: exercise.exercise_id,
      exerciseName: exercise.exercise_name,
      setNumber: setIndex + 1,
      weightKg: w,
      reps: r,
    });
    setSets((prev) => {
      const updated = [...(prev[exercise.exercise_id] || [])];
      updated[setIndex] = { ...updated[setIndex], completed: true, isPR: result.isPR, dbId: result.id };
      return { ...prev, [exercise.exercise_id]: updated };
    });
    // Start rest timer
    const restSeconds = exercise.rest_seconds || 90;
    setRestTime(restSeconds);
    setIsResting(true);
  };

  const handleFinish = async () => {
    setFinishing(true);
    await db.completeSession(sessionId, { durationSeconds: elapsed, notes });
    setFinishing(false);
    setShowFinish(false);
    navigation.goBack();
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'Are you sure you want to discard this workout? All progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => {
        await db.deleteSession(sessionId);
        navigation.goBack();
      }},
    ]);
  };

  const completedSets = Object.values(sets).flat().filter((s) => s.completed).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.dayName, { color: theme.text }]}>{programDay?.name || dayName || 'Workout'}</Text>
          <Text style={[styles.timer, { color: theme.accent }]}>{formatTime(elapsed)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.setsCount, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
            <Text style={[styles.setsCountText, { color: theme.accent }]}>{completedSets} sets</Text>
          </View>
          <TouchableOpacity onPress={handleDiscard} style={styles.discardBtn}>
            <Ionicons name="close" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest timer banner */}
      {isResting && (
        <TouchableOpacity
          onPress={() => { setIsResting(false); setRestTime(0); }}
          style={[styles.restBanner, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}
        >
          <Ionicons name="timer-outline" size={16} color={theme.accent} />
          <Text style={[styles.restText, { color: theme.accent }]}>Rest: {formatTime(restTime)}  (tap to skip)</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {exercises.map((exercise) => {
          const exSets = sets[exercise.exercise_id] || [];
          const last = lastSets[exercise.exercise_id];
          return (
            <Card key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { color: theme.text }]}>{exercise.exercise_name}</Text>
                  <View style={styles.exMeta}>
                    <MuscleTag group={exercise.muscle_group} />
                    {last && (
                      <Text style={[styles.lastSet, { color: theme.textMuted }]}>
                        Last: {last.weight_kg ? `${last.weight_kg}kg` : '—'} × {last.reps ?? '—'}
                      </Text>
                    )}
                  </View>
                </View>
                {exercise.sets && exercise.reps ? (
                  <Text style={[styles.exTarget, { color: theme.textSecondary }]}>
                    {exercise.sets}×{exercise.reps}
                  </Text>
                ) : null}
              </View>

              {/* Column headers */}
              <View style={styles.setHeaderRow}>
                <Text style={[styles.setHeaderCell, { color: theme.textMuted, width: 30 }]}>#</Text>
                <Text style={[styles.setHeaderCell, { color: theme.textMuted, flex: 1 }]}>kg</Text>
                <Text style={[styles.setHeaderCell, { color: theme.textMuted, flex: 1 }]}>reps</Text>
                <View style={{ width: 44 }} />
              </View>

              {exSets.map((set, i) => (
                <View key={i} style={[styles.setRow, set.completed && { opacity: 0.7 }]}>
                  <Text style={[styles.setNum, { color: theme.textMuted }]}>{i + 1}</Text>
                  <TextInput
                    value={set.weight}
                    onChangeText={(v) => updateSet(exercise.exercise_id, i, 'weight', v)}
                    placeholder={last?.weight_kg ? String(last.weight_kg) : '—'}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    editable={!set.completed}
                    style={[styles.setInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
                  />
                  <TextInput
                    value={set.reps}
                    onChangeText={(v) => updateSet(exercise.exercise_id, i, 'reps', v)}
                    placeholder={last?.reps ? String(last.reps) : '—'}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    editable={!set.completed}
                    style={[styles.setInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
                  />
                  <TouchableOpacity
                    onPress={() => !set.completed && completeSet(exercise, i)}
                    style={[
                      styles.checkBtn,
                      set.completed
                        ? { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }
                        : { borderColor: theme.border },
                    ]}
                  >
                    {set.completed ? (
                      <View>
                        <Ionicons name="checkmark" size={18} color={theme.accent} />
                        {set.isPR && <Text style={[styles.prBadge, { color: theme.accent }]}>PR</Text>}
                      </View>
                    ) : (
                      <Ionicons name="checkmark" size={18} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => addSet(exercise.exercise_id)}
                style={[styles.addSetBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="add" size={14} color={theme.textSecondary} />
                <Text style={[styles.addSetText, { color: theme.textSecondary }]}>Add Set</Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>💪</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Add your first exercise to start logging sets.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={openAddExercise}
          style={[styles.addExerciseBtn, { borderColor: theme.accentBorder, backgroundColor: theme.accentBg }]}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
          <Text style={[styles.addExerciseText, { color: theme.accent }]}>Add Exercise</Text>
        </TouchableOpacity>

        <Button
          title="Finish Workout"
          onPress={() => setShowFinish(true)}
          size="lg"
          disabled={exercises.length === 0}
          style={{ marginTop: spacing[3], marginBottom: spacing[8] }}
        />
      </ScrollView>

      {/* Finish Modal */}
      <Modal visible={showFinish} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Finish Workout?</Text>
            <TouchableOpacity onPress={() => setShowFinish(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.summaryValue, { color: theme.accent }]}>{formatTime(elapsed)}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Duration</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.summaryValue, { color: theme.accent }]}>{completedSets}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Sets Done</Text>
              </View>
            </View>
            <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go? Any PRs? Injuries?"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.notesInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />
            <Button title="Save Workout" onPress={handleFinish} loading={finishing} size="lg" style={{ marginTop: spacing[4] }} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exercise</Text>
            <TouchableOpacity onPress={() => setShowAddExercise(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              value={exSearch}
              onChangeText={(v) => { setExSearch(v); searchExercises(v); }}
              placeholder="Search exercises…"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              autoFocus
            />
          </View>
          {exLoading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[8] }} />
          ) : (
            <FlatList
              data={pickerExercises}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const added = exercises.some((e) => e.exercise_id === item.id);
                return (
                  <TouchableOpacity
                    onPress={() => handleAddExercise(item)}
                    disabled={added}
                    style={[styles.exListItem, { borderBottomColor: theme.border, opacity: added ? 0.4 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exListName, { color: theme.text }]}>{item.name}</Text>
                      <MuscleTag group={item.muscle_group} style={{ marginTop: 2 }} />
                    </View>
                    {added ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                    ) : (
                      <Text style={[styles.exListCategory, { color: theme.textMuted }]}>{item.category}</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1 },
  dayName: { fontSize: typography.sizes.lg, fontWeight: '700' },
  timer: { fontSize: typography.sizes['2xl'], fontWeight: '700', fontVariant: ['tabular-nums'] },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  setsCount: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  setsCountText: { fontSize: typography.sizes.sm, fontWeight: '700' },
  discardBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  restBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2], borderBottomWidth: 1 },
  restText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  content: { padding: spacing[4], gap: spacing[4] },
  exerciseCard: {},
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[3] },
  exName: { fontSize: typography.sizes.base, fontWeight: '700' },
  exMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 },
  lastSet: { fontSize: typography.sizes.xs },
  exTarget: { fontSize: typography.sizes.sm, fontWeight: '500' },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[1] },
  setHeaderCell: { fontSize: typography.sizes.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  setNum: { width: 30, fontSize: typography.sizes.sm, textAlign: 'center' },
  setInput: { flex: 1, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: spacing[2], fontSize: typography.sizes.base, textAlign: 'center' },
  checkBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  prBadge: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2], borderTopWidth: 1, marginTop: spacing[1] },
  addSetText: { fontSize: typography.sizes.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing[8], gap: spacing[2] },
  emptyText: { fontSize: typography.sizes.base, textAlign: 'center', paddingHorizontal: spacing[6] },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  addExerciseText: { fontSize: typography.sizes.base, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginHorizontal: spacing[4], marginBottom: spacing[2], borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  searchInput: { flex: 1, fontSize: typography.sizes.base },
  exListItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1 },
  exListName: { fontSize: typography.sizes.base, fontWeight: '500' },
  exListCategory: { fontSize: typography.sizes.sm, textTransform: 'capitalize' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: '700' },
  modalContent: { padding: spacing[5] },
  summaryRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  summaryItem: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing[4], alignItems: 'center' },
  summaryValue: { fontSize: typography.sizes['2xl'], fontWeight: '700' },
  summaryLabel: { fontSize: typography.sizes.sm, marginTop: 2 },
  notesLabel: { fontSize: typography.sizes.sm, fontWeight: '500', marginBottom: spacing[1] },
  notesInput: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: typography.sizes.base, minHeight: 80, textAlignVertical: 'top' },
});
