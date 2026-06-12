import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import * as db from '../services/database';
import Card from '../components/Card';
import Button from '../components/Button';
import { generateProgram } from '../services/gemini';
import { getGeminiKey } from './SettingsScreen';

export default function ProgramsScreen({ navigation }) {
  const { theme } = useTheme();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDays, setNewDays] = useState('3');
  const [creating, setCreating] = useState(false);

  useFocusEffect(useCallback(() => {
    getGeminiKey().then((k) => setHasKey(!!k));
  }, []));

  const loadPrograms = async () => {
    setLoading(true);
    const data = await db.getPrograms();
    setPrograms(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadPrograms(); }, []));

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setAiGenerating(true);
    setAiError('');
    try {
      const exercises = await db.getExercises();
      const exerciseNames = exercises.map((e) => e.name);

      // Parse days/week from prompt or default 3
      const daysMatch = prompt.match(/(\d)\s*(?:day|x)/i);
      const daysPerWeek = daysMatch ? parseInt(daysMatch[1]) : 3;

      const result = await generateProgram({
        goal: prompt,
        daysPerWeek,
        equipment: 'full gym',
        notes: '',
        exerciseNames,
      });

      // Save program
      const progId = await db.createProgram({
        name: result.name,
        description: result.description,
        daysPerWeek: result.days?.length || daysPerWeek,
      });

      // Save days + exercises
      for (let i = 0; i < (result.days || []).length; i++) {
        const day = result.days[i];
        const dayId = await db.addProgramDay(progId, {
          name: day.name,
          dayNumber: i + 1,
          sortOrder: i,
        });
        for (let j = 0; j < (day.exercises || []).length; j++) {
          const ex = day.exercises[j];
          const match = exercises.find(
            (e) => e.name.toLowerCase() === ex.name.toLowerCase()
          );
          if (match) {
            await db.addExerciseToDay(dayId, {
              exerciseId: match.id,
              sets: ex.sets || 3,
              reps: ex.reps || '8-12',
              restSeconds: ex.restSeconds || 90,
              sortOrder: j,
            });
          }
        }
      }

      setAiGenerating(false);
      setShowCreate(false);
      setAiPrompt('');
      navigation.navigate('ProgramDetail', { programId: progId });
    } catch (e) {
      setAiGenerating(false);
      setAiError(e.message === 'NO_KEY' ? 'Add your Gemini API key in Settings first.' : e.message);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const id = await db.createProgram({ name: newName.trim(), description: newDesc.trim(), daysPerWeek: parseInt(newDays) || 3 });
    setCreating(false);
    setShowCreate(false);
    setNewName(''); setNewDesc(''); setNewDays('3');
    navigation.navigate('ProgramDetail', { programId: id });
  };

  const handleSetActive = async (program) => {
    await db.updateProgram(program.id, { isActive: !program.is_active });
    loadPrograms();
  };

  const handleDelete = (program) => {
    Alert.alert('Delete Program', `Delete "${program.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await db.deleteProgram(program.id); loadPrograms(); } },
    ]);
  };

  const renderProgram = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProgramDetail', { programId: item.id })} activeOpacity={0.8}>
      <Card style={[styles.programCard, item.is_active && { borderColor: theme.accent }]}>
        <View style={styles.programHeader}>
          <View style={styles.programInfo}>
            {item.is_active && (
              <View style={[styles.activeBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                <Text style={[styles.activeBadgeText, { color: theme.accent }]}>ACTIVE</Text>
              </View>
            )}
            <Text style={[styles.programName, { color: theme.text }]}>{item.name}</Text>
            {item.description ? (
              <Text style={[styles.programDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={[styles.programMeta, { color: theme.textMuted }]}>{item.days_per_week} days/week</Text>
          </View>
          <View style={styles.programActions}>
            <TouchableOpacity
              onPress={() => handleSetActive(item)}
              style={[styles.actionBtn, { borderColor: theme.border }]}
            >
              <Ionicons
                name={item.is_active ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={item.is_active ? theme.accent : theme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={[styles.actionBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Start workout button for active program */}
        {item.is_active && (
          <Button
            title="Start Workout"
            onPress={() => navigation.navigate('ProgramDetail', { programId: item.id, startWorkout: true })}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>GymMate</Text>
        <Text style={[styles.subtitle, { color: theme.accent }]}>Programs</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={[styles.addBtn, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}
        >
          <Text style={{ fontSize: 22, color: theme.accent, lineHeight: 26 }}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[10] }} />
      ) : programs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🏋️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No programs yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Create your first workout program to get started.</Text>
          <Button title="Create Program" onPress={() => setShowCreate(true)} style={{ marginTop: spacing[4] }} />
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProgram}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Program Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Program</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* AI Generation */}
            {hasKey ? (
              <View style={[styles.aiBox, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                <Text style={[styles.aiLabel, { color: theme.accent }]}>🤖 Generate with AI</Text>
                <TextInput
                  value={aiPrompt}
                  onChangeText={(v) => { setAiPrompt(v); setAiError(''); }}
                  placeholder="e.g. Hypertrophy 4 days, shoulder injury, no overhead"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  style={[styles.textInput, styles.textarea, { backgroundColor: theme.input, borderColor: theme.accentBorder, color: theme.text, marginTop: spacing[2] }]}
                />
                {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}
                <Button
                  title={aiGenerating ? 'Generating…' : 'Generate Program'}
                  onPress={handleAiGenerate}
                  loading={aiGenerating}
                  disabled={!aiPrompt.trim()}
                  style={{ marginTop: spacing[2] }}
                />
              </View>
            ) : (
              <View style={[styles.aiBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.aiLabel, { color: theme.textMuted }]}>🤖 AI Generation</Text>
                <Text style={[styles.aiHint, { color: theme.textMuted }]}>Add your Gemini API key in Settings → AI Features to generate programs automatically.</Text>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or create manually</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Program Name *</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Push Pull Legs"
              placeholderTextColor={theme.textMuted}
              style={[styles.textInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: spacing[4] }]}>Description (optional)</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Brief description of this program"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.textInput, styles.textarea, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: spacing[4] }]}>Days per week</Text>
            <View style={styles.daysRow}>
              {['2', '3', '4', '5', '6'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setNewDays(d)}
                  style={[
                    styles.dayOption,
                    { borderColor: newDays === d ? theme.accent : theme.border, backgroundColor: newDays === d ? theme.accentBg : theme.card },
                  ]}
                >
                  <Text style={[styles.dayOptionText, { color: newDays === d ? theme.accent : theme.text }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Create Program" onPress={handleCreate} loading={creating} style={{ marginTop: spacing[6] }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[4], flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: typography.sizes['2xl'], fontWeight: '700', flex: 1 },
  subtitle: { fontSize: typography.sizes.lg, fontWeight: '600', marginRight: spacing[3] },
  addBtn: { width: 36, height: 36, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[4], gap: spacing[3] },
  programCard: {},
  programHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  programInfo: { flex: 1 },
  activeBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2, marginBottom: spacing[1], alignSelf: 'flex-start' },
  activeBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  programName: { fontSize: typography.sizes.lg, fontWeight: '700', marginBottom: 2 },
  programDesc: { fontSize: typography.sizes.sm, marginBottom: spacing[1] },
  programMeta: { fontSize: typography.sizes.xs },
  programActions: { flexDirection: 'row', gap: spacing[2], marginLeft: spacing[2] },
  actionBtn: { width: 32, height: 32, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[3] },
  emptyText: { fontSize: typography.sizes.base, textAlign: 'center', marginTop: spacing[2] },
  aiBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing[4], marginBottom: spacing[2] },
  aiLabel: { fontSize: typography.sizes.base, fontWeight: '700' },
  aiHint: { fontSize: typography.sizes.sm, marginTop: spacing[1] },
  aiError: { color: '#ef4444', fontSize: typography.sizes.sm, marginTop: spacing[1] },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: spacing[4] },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: typography.sizes.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: '700' },
  modalContent: { padding: spacing[5] },
  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: '500', marginBottom: spacing[1] },
  textInput: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: typography.sizes.base },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  daysRow: { flexDirection: 'row', gap: spacing[2] },
  dayOption: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayOptionText: { fontWeight: '700', fontSize: typography.sizes.base },
});
