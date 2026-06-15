import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import TemplateCard from '../../components/trainer/TemplateCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography, radius } from '../../theme';
import * as programTemplates from '../../services/programTemplates';
import * as auth from '../../services/auth';
import * as db from '../../services/database';
import { generateProgram } from '../../services/gemini';
import { getGeminiKey } from '../SettingsScreen';
import { bestMatch } from '../../utils/matchExercise';

export default function TemplatesScreen({ navigation }) {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState('manual'); // 'manual' or 'ai'
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTemplates();
      getGeminiKey().then((k) => setHasKey(!!k));
    }, [])
  );

  async function loadTemplates() {
    try {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const fetchedTemplates = await programTemplates.getMyTemplates(user.id);
      console.log('[TemplatesScreen] Loaded templates:', fetchedTemplates);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateTemplate() {
    setShowCreate(true);
    setCreateMode(hasKey ? 'ai' : 'manual');
  }

  async function handleAiGenerate() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      if (Platform.OS === 'web') {
        alert('Please enter a program description');
      } else {
        Alert.alert('Error', 'Please enter a program description');
      }
      return;
    }

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

      // Create program as template
      const progId = await db.createProgram(result.name, result.description, true, currentUser.id);

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
          const match =
            exercises.find((e) => e.name.toLowerCase() === ex.name.toLowerCase()) ||
            bestMatch(ex.name, exercises);
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

      // Create Firestore template
      await programTemplates.createTemplate(currentUser.id, {
        name: result.name,
        description: result.description || '',
        daysPerWeek: result.days?.length || daysPerWeek,
        programId: progId,
      });

      setAiGenerating(false);
      setShowCreate(false);
      setAiPrompt('');
      setAiError('');
      await loadTemplates();

      navigation.navigate('ProgramDetail', { programId: progId, isTemplate: true });
    } catch (e) {
      setAiGenerating(false);
      setAiError(e.message === 'NO_KEY' ? 'Add your Gemini API key in Settings first.' : e.message);
    }
  }

  async function handleCreateSubmit() {
    if (!newName.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a template name');
      } else {
        Alert.alert('Error', 'Please enter a template name');
      }
      return;
    }

    setCreating(true);

    try {
      // Create as a local program with is_template=1
      const programId = await db.createProgram(newName.trim(), newDesc.trim() || null, true, currentUser.id);

      // Create the Firestore template
      await programTemplates.createTemplate(
        currentUser.id,
        {
          name: newName.trim(),
          description: newDesc.trim() || '',
          daysPerWeek: 3,
          programId: programId,
        }
      );

      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      await loadTemplates();

      // Navigate to edit the template
      navigation.navigate('ProgramDetail', { programId, isTemplate: true });
    } catch (error) {
      console.error('Failed to create template:', error);
      if (Platform.OS === 'web') {
        alert(`Failed to create template: ${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to create template');
      }
    } finally {
      setCreating(false);
    }
  }

  function handleTemplatePress(template) {
    // Navigate to edit instead (no separate detail view)
    handleEditTemplate(template);
  }

  function handleEditTemplate(template) {
    console.log('[TemplatesScreen] Edit template:', template);
    if (!template.programId) {
      if (Platform.OS === 'web') {
        alert('Error: Template is missing programId. Please recreate this template.');
      } else {
        Alert.alert('Error', 'Template is missing programId. Please recreate this template.');
      }
      return;
    }
    navigation.navigate('ProgramDetail', {
      programId: template.programId,
      isTemplate: true
    });
  }

  function handleAssignTemplate(template) {
    navigation.navigate('AssignProgram', { template });
  }

  async function handleDeleteTemplate(template) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Delete "${template.name}"?\n\nThis won't affect programs already assigned to clients.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Template',
            `Are you sure you want to delete "${template.name}"? This won't affect programs already assigned to clients.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      // Delete from Firestore
      await programTemplates.deleteTemplate(template.templateId);

      // Delete from local DB if programId exists
      if (template.programId) {
        await db.deleteProgram(template.programId);
      }

      await loadTemplates();

      if (Platform.OS === 'web') {
        alert('Template deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      if (Platform.OS === 'web') {
        alert(`Failed to delete template: ${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to delete template');
      }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: theme.textSecondary }}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Program Templates</Text>
          <TouchableOpacity onPress={handleCreateTemplate}>
            <Ionicons name="add-circle" size={28} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Templates List */}
        {templates.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No templates yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Create reusable program templates to assign to multiple clients
            </Text>
            <Button
              title="Create Template"
              onPress={handleCreateTemplate}
              style={{ marginTop: spacing[4] }}
            />
          </Card>
        ) : (
          <View style={styles.templatesList}>
            {templates.map((template) => (
              <TemplateCard
                key={template.templateId}
                template={template}
                onPress={() => handleTemplatePress(template)}
                onEdit={() => handleEditTemplate(template)}
                onAssign={() => handleAssignTemplate(template)}
                onDelete={() => handleDeleteTemplate(template)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Template Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreate(false);
          setNewName('');
          setNewDesc('');
          setAiPrompt('');
          setAiError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Template</Text>

            {/* Tabs */}
            {hasKey && (
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    createMode === 'ai' && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setCreateMode('ai')}
                >
                  <Text style={[styles.tabText, { color: createMode === 'ai' ? theme.accent : theme.textSecondary }]}>
                    🤖 AI Generate
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    createMode === 'manual' && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setCreateMode('manual')}
                >
                  <Text style={[styles.tabText, { color: createMode === 'manual' ? theme.accent : theme.textSecondary }]}>
                    ✍️ Manual
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* AI Mode */}
            {createMode === 'ai' ? (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Describe your program</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="e.g. 3 day upper/lower split for strength, 60 min sessions"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={4}
                />
                {aiError ? <Text style={[styles.errorText, { color: '#ef4444' }]}>{aiError}</Text> : null}

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowCreate(false);
                      setAiPrompt('');
                      setAiError('');
                    }}
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Generate"
                    onPress={handleAiGenerate}
                    loading={aiGenerating}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Template Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Beginner Strength Program"
                  placeholderTextColor={theme.textMuted}
                />

                <Text style={[styles.label, { color: theme.text }]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  placeholder="Add details about this template"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowCreate(false);
                      setNewName('');
                      setNewDesc('');
                    }}
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Create"
                    onPress={handleCreateSubmit}
                    loading={creating}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  templatesList: {
    marginTop: spacing[2],
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.lg,
    padding: spacing[6],
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[6],
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  input: {
    borderRadius: radius.md,
    padding: spacing[3],
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  tabText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
  },
});
