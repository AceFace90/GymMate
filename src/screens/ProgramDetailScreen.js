import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, FlatList, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius, colors } from '../theme';
import * as db from '../services/database';
import Card from '../components/Card';
import Button from '../components/Button';
import MuscleTag from '../components/MuscleTag';
import { confirmAction } from '../utils/confirm';

export default function ProgramDetailScreen({ route, navigation }) {
  const { programId, startWorkout } = route.params;
  const { theme } = useTheme();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add day modal
  const [showAddDay, setShowAddDay] = useState(false);
  const [dayName, setDayName] = useState('');

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [activeDayId, setActiveDayId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [exSearch, setExSearch] = useState('');
  const [exLoading, setExLoading] = useState(false);

  // Select day to start workout
  const [showPickDay, setShowPickDay] = useState(false);

  const loadProgram = async () => {
    setLoading(true);
    const data = await db.getProgramById(programId);
    setProgram(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadProgram(); }, [programId]));

  useEffect(() => {
    if (startWorkout && program) setShowPickDay(true);
  }, [startWorkout, program]);

  const searchExercises = async (query) => {
    setExLoading(true);
    const results = await db.getExercises({ search: query || undefined });
    setExercises(results);
    setExLoading(false);
  };

  const openAddExercise = (dayId) => {
    setActiveDayId(dayId);
    setExSearch('');
    searchExercises('');
    setShowAddExercise(true);
  };

  const handleAddDay = async () => {
    if (!dayName.trim()) return;
    const sortOrder = program.days?.length || 0;
    await db.addProgramDay(programId, { name: dayName.trim(), dayNumber: sortOrder + 1, sortOrder });
    setShowAddDay(false);
    setDayName('');
    loadProgram();
  };

  const handleAddExercise = async (exercise) => {
    await db.addExerciseToDay(activeDayId, { exerciseId: exercise.id });
    setShowAddExercise(false);
    loadProgram();
  };

  const handleRemoveExercise = (peId, exerciseName) => {
    confirmAction({
      title: 'Remove Exercise',
      message: `Remove "${exerciseName}" from this day?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => { await db.removeExerciseFromDay(peId); loadProgram(); },
    });
  };

  const handleDeleteDay = (day) => {
    confirmAction({
      title: 'Delete Day',
      message: `Delete "${day.name}" and all its exercises?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => { await db.deleteProgramDay(day.id); loadProgram(); },
    });
  };

  const startWorkoutForDay = async (day) => {
    setShowPickDay(false);
    const sessionId = await db.startSession({ programId, programDayId: day.id, dayName: day.name });
    navigation.navigate('ActiveWorkout', { sessionId, programDay: day, programId });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!program) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Program header */}
        <View style={styles.programHeader}>
          <Text style={[styles.programName, { color: theme.text }]}>{program.name}</Text>
          {program.description ? (
            <Text style={[styles.programDesc, { color: theme.textSecondary }]}>{program.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
              <Text style={[styles.metaBadgeText, { color: theme.accent }]}>{program.days_per_week} days/week</Text>
            </View>
            {program.is_active ? (
              <View style={[styles.metaBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                <Text style={[styles.metaBadgeText, { color: theme.accent }]}>✓ Active</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Start workout CTA */}
        {(program.days?.length ?? 0) > 0 && (
          <Button title="▶  Start Workout" onPress={() => setShowPickDay(true)} size="lg" style={{ marginBottom: spacing[5] }} />
        )}

        {/* Days */}
        {(program.days || []).map((day) => (
          <Card key={day.id} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, { color: theme.text }]}>{day.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteDay(day)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {(day.exercises || []).map((ex) => (
              <View key={ex.id} style={[styles.exerciseRow, { borderTopColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { color: theme.text }]}>{ex.exercise_name}</Text>
                  <View style={styles.exMeta}>
                    <MuscleTag group={ex.muscle_group} />
                    <Text style={[styles.exSets, { color: theme.textSecondary }]}> {ex.sets} × {ex.reps}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(ex.id, ex.exercise_name)}>
                  <Ionicons name="close-circle-outline" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => openAddExercise(day.id)}
              style={[styles.addExerciseBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
              <Text style={[styles.addExerciseText, { color: theme.accent }]}>Add Exercise</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Add Day button */}
        <TouchableOpacity
          onPress={() => setShowAddDay(true)}
          style={[styles.addDayBtn, { borderColor: theme.accentBorder, backgroundColor: theme.accentBg }]}
        >
          <Ionicons name="add" size={20} color={theme.accent} />
          <Text style={[styles.addDayText, { color: theme.accent }]}>Add Training Day</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Day Modal */}
      <Modal visible={showAddDay} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Training Day</Text>
            <TouchableOpacity onPress={() => setShowAddDay(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Day Name</Text>
            <TextInput
              value={dayName}
              onChangeText={setDayName}
              placeholder="e.g. Push Day, Leg Day, Upper A…"
              placeholderTextColor={theme.textMuted}
              style={[styles.textInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
              autoFocus
            />
            <Button title="Add Day" onPress={handleAddDay} style={{ marginTop: spacing[4] }} />
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
              data={exercises}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddExercise(item)}
                  style={[styles.exListItem, { borderBottomColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exListName, { color: theme.text }]}>{item.name}</Text>
                    <MuscleTag group={item.muscle_group} style={{ marginTop: 2 }} />
                  </View>
                  <Text style={[styles.exListCategory, { color: theme.textMuted }]}>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Pick Day to Start Modal */}
      <Modal visible={showPickDay} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Day</Text>
            <TouchableOpacity onPress={() => setShowPickDay(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {(program.days || []).map((day) => (
              <TouchableOpacity
                key={day.id}
                onPress={() => startWorkoutForDay(day)}
                style={[styles.dayPickBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.dayPickName, { color: theme.text }]}>{day.name}</Text>
                <Text style={[styles.dayPickCount, { color: theme.textSecondary }]}>
                  {day.exercises?.length ?? 0} exercises
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing[4], gap: spacing[3] },
  programHeader: { marginBottom: spacing[2] },
  programName: { fontSize: typography.sizes['2xl'], fontWeight: '700' },
  programDesc: { marginTop: spacing[1], fontSize: typography.sizes.base },
  metaRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  metaBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2 },
  metaBadgeText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  dayCard: {},
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  dayName: { fontSize: typography.sizes.lg, fontWeight: '700' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2], borderTopWidth: 1 },
  exName: { fontSize: typography.sizes.base, fontWeight: '500' },
  exMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  exSets: { fontSize: typography.sizes.sm, marginLeft: spacing[1] },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingTop: spacing[3], marginTop: spacing[2], borderTopWidth: 1 },
  addExerciseText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', marginTop: spacing[2] },
  addDayText: { fontSize: typography.sizes.base, fontWeight: '600' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: '700' },
  modalContent: { padding: spacing[5] },
  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: '500', marginBottom: spacing[1] },
  textInput: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: typography.sizes.base },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginHorizontal: spacing[4], marginBottom: spacing[2], borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  searchInput: { flex: 1, fontSize: typography.sizes.base },
  exListItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1 },
  exListName: { fontSize: typography.sizes.base, fontWeight: '500' },
  exListCategory: { fontSize: typography.sizes.sm, textTransform: 'capitalize' },
  dayPickBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, padding: spacing[4], marginBottom: spacing[3] },
  dayPickName: { fontSize: typography.sizes.lg, fontWeight: '600', flex: 1 },
  dayPickCount: { fontSize: typography.sizes.sm, marginRight: spacing[2] },
});
