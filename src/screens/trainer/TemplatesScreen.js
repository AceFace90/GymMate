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

export default function TemplatesScreen({ navigation }) {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTemplates();
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
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateTemplate() {
    setShowCreate(true);
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
    navigation.navigate('TemplateDetail', { template });
  }

  function handleEditTemplate(template) {
    navigation.navigate('ProgramDetail', {
      programId: template.templateId,
      isTemplate: true
    });
  }

  function handleAssignTemplate(template) {
    navigation.navigate('AssignProgram', { template });
  }

  async function handleDeleteTemplate(template) {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This won't affect programs already assigned to clients.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await programTemplates.deleteTemplate(template.templateId);
              await loadTemplates();
            } catch (error) {
              console.error('Failed to delete template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
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
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Template</Text>

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
});
