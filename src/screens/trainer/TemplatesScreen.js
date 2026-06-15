import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import TemplateCard from '../../components/trainer/TemplateCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography } from '../../theme';
import * as programTemplates from '../../services/programTemplates';
import * as auth from '../../services/auth';

export default function TemplatesScreen({ navigation }) {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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
    // Navigate to program creation with template mode
    navigation.navigate('CreateProgram', { isTemplate: true });
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
});
