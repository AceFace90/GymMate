import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography, radius } from '../../theme';
import * as programTemplates from '../../services/programTemplates';
import * as trainerClient from '../../services/trainerClient';
import * as auth from '../../services/auth';

export default function AssignProgramScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { client, template: preselectedTemplate } = route.params || {};

  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(preselectedTemplate || null);
  const [selectedClients, setSelectedClients] = useState(client ? [client] : []);
  const [assignmentType, setAssignmentType] = useState('linked');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);

      if (!user) return;

      const [fetchedTemplates, fetchedClients] = await Promise.all([
        programTemplates.getMyTemplates(user.id),
        trainerClient.getMyClients(user.id),
      ]);

      setTemplates(fetchedTemplates);
      setClients(fetchedClients);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  function toggleClient(client) {
    setSelectedClients((prev) =>
      prev.find((c) => c.clientId === client.clientId)
        ? prev.filter((c) => c.clientId !== client.clientId)
        : [...prev, client]
    );
  }

  async function handleAssign() {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template');
      return;
    }

    if (selectedClients.length === 0) {
      Alert.alert('Error', 'Please select at least one client');
      return;
    }

    setLoading(true);

    try {
      for (const client of selectedClients) {
        await programTemplates.assignToClient(
          selectedTemplate.templateId,
          client.clientId,
          currentUser.id,
          assignmentType
        );
      }

      Alert.alert(
        'Success',
        `Program assigned to ${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''}`
      );
      navigation.goBack();
    } catch (error) {
      console.error('Failed to assign program:', error);
      Alert.alert('Error', 'Failed to assign program');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Assign Program</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Select Template */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Template</Text>
        {selectedTemplate ? (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedName, { color: theme.text }]}>
                  {selectedTemplate.name}
                </Text>
                <Text style={[styles.selectedMeta, { color: theme.textSecondary }]}>
                  {selectedTemplate.daysPerWeek} days/week
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.templateId}
                onPress={() => setSelectedTemplate(template)}
              >
                <Card style={styles.templateCard}>
                  <Text style={[styles.templateName, { color: theme.text }]} numberOfLines={1}>
                    {template.name}
                  </Text>
                  <Text style={[styles.templateMeta, { color: theme.textSecondary }]}>
                    {template.daysPerWeek} days
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Select Clients */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Client(s)</Text>
        <View style={styles.clientsList}>
          {clients.map((client) => {
            const isSelected = selectedClients.find((c) => c.clientId === client.clientId);
            return (
              <TouchableOpacity
                key={client.clientId}
                onPress={() => toggleClient(client)}
              >
                <Card style={[styles.clientCard, isSelected && { borderColor: theme.accent, borderWidth: 2 }]}>
                  <View style={styles.clientRow}>
                    <Text style={[styles.clientName, { color: theme.text }]}>
                      {client.clientName}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Assignment Type */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignment Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              { borderColor: theme.border },
              assignmentType === 'linked' && { backgroundColor: theme.accentBg, borderColor: theme.accent },
            ]}
            onPress={() => setAssignmentType('linked')}
          >
            <Ionicons
              name="link"
              size={20}
              color={assignmentType === 'linked' ? theme.accent : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeText,
                { color: assignmentType === 'linked' ? theme.accent : theme.textSecondary },
              ]}
            >
              Linked
            </Text>
            <Text style={[styles.typeDesc, { color: theme.textMuted }]}>
              Updates when you edit template
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              { borderColor: theme.border },
              assignmentType === 'custom' && { backgroundColor: theme.accentBg, borderColor: theme.accent },
            ]}
            onPress={() => setAssignmentType('custom')}
          >
            <Ionicons
              name="copy"
              size={20}
              color={assignmentType === 'custom' ? theme.accent : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeText,
                { color: assignmentType === 'custom' ? theme.accent : theme.textSecondary },
              ]}
            >
              Custom Copy
            </Text>
            <Text style={[styles.typeDesc, { color: theme.textMuted }]}>
              One-time copy, independent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Assign Button */}
        <Button
          title={`Assign to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
          onPress={handleAssign}
          loading={loading}
          disabled={!selectedTemplate || selectedClients.length === 0}
          style={{ marginTop: spacing[6] }}
        />
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  selectedCard: {
    marginBottom: spacing[3],
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  selectedMeta: {
    fontSize: typography.sizes.sm,
  },
  templateScroll: {
    marginBottom: spacing[3],
  },
  templateCard: {
    width: 140,
    marginRight: spacing[3],
    padding: spacing[3],
  },
  templateName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  templateMeta: {
    fontSize: typography.sizes.xs,
  },
  clientsList: {
    marginBottom: spacing[3],
  },
  clientCard: {
    marginBottom: spacing[2],
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  typeButton: {
    flex: 1,
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[2],
  },
  typeDesc: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
    textAlign: 'center',
  },
});
