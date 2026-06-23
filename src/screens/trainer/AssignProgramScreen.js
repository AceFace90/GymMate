import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography, radius } from '../../theme';
import * as programTemplates from '../../services/programTemplates';
import * as trainerClient from '../../services/trainerClient';
import * as auth from '../../services/auth';
import * as db from '../../services/database';

export default function AssignProgramScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { client: preselectedClient, program: preselectedProgram } = route.params || {};

  const [programs, setPrograms] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(preselectedProgram || null);
  const [selectedClients, setSelectedClients] = useState(preselectedClient ? [preselectedClient] : []);
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

      const [allPrograms, fetchedClients] = await Promise.all([
        db.getPrograms(),
        trainerClient.getMyClients(user.id),
      ]);

      // Only show programs this trainer created (not ones assigned to them)
      const ownPrograms = allPrograms.filter(
        (p) => !p.linked_template_id && (p.created_by_user_id === user.id || !p.created_by_user_id)
      );
      setPrograms(ownPrograms);
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
    if (!selectedProgram) {
      if (Platform.OS === 'web') {
        alert('Please select a program');
      } else {
        Alert.alert('Error', 'Please select a program');
      }
      return;
    }
    if (selectedClients.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one client');
      } else {
        Alert.alert('Error', 'Please select at least one client');
      }
      return;
    }

    setLoading(true);
    try {
      // Silently upsert a Firestore template so "push updates" works later
      const templateId = await programTemplates.upsertTemplateForProgram(currentUser.id, selectedProgram);

      for (const client of selectedClients) {
        await programTemplates.assignToClient(
          templateId,
          client.clientId,
          currentUser.id,
          assignmentType
        );
      }

      if (Platform.OS === 'web') {
        alert(`Program assigned to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`);
      } else {
        Alert.alert('Success', `Program assigned to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`);
      }
      navigation.goBack();
    } catch (error) {
      console.error('[AssignProgramScreen] Failed to assign:', error);
      if (Platform.OS === 'web') {
        alert(`Failed to assign program: ${error.message}`);
      } else {
        Alert.alert('Error', 'Failed to assign program');
      }
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

        {/* Select Program */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Program</Text>
        {selectedProgram ? (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedName, { color: theme.text }]}>{selectedProgram.name}</Text>
                <Text style={[styles.selectedMeta, { color: theme.textSecondary }]}>
                  {selectedProgram.days_per_week} days/week
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedProgram(null)}>
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScroll}>
            {programs.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No programs yet — create one in the Programs tab first.
              </Text>
            ) : programs.map((program) => (
              <TouchableOpacity
                key={program.id}
                onPress={() => setSelectedProgram(program)}
              >
                <Card style={styles.programCard}>
                  <Text style={[styles.programName, { color: theme.text }]} numberOfLines={2}>
                    {program.name}
                  </Text>
                  <Text style={[styles.programMeta, { color: theme.textSecondary }]}>
                    {program.days_per_week} days
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
              <TouchableOpacity key={client.clientId} onPress={() => toggleClient(client)}>
                <Card style={[styles.clientCard, isSelected && { borderColor: theme.accent, borderWidth: 2 }]}>
                  <View style={styles.clientRow}>
                    <Text style={[styles.clientName, { color: theme.text }]}>{client.clientName}</Text>
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
            style={[styles.typeButton, { borderColor: theme.border },
              assignmentType === 'linked' && { backgroundColor: theme.accentBg, borderColor: theme.accent }]}
            onPress={() => setAssignmentType('linked')}
          >
            <Ionicons name="link" size={20} color={assignmentType === 'linked' ? theme.accent : theme.textSecondary} />
            <Text style={[styles.typeText, { color: assignmentType === 'linked' ? theme.accent : theme.textSecondary }]}>
              Linked
            </Text>
            <Text style={[styles.typeDesc, { color: theme.textMuted }]}>Updates when you edit program</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, { borderColor: theme.border },
              assignmentType === 'custom' && { backgroundColor: theme.accentBg, borderColor: theme.accent }]}
            onPress={() => setAssignmentType('custom')}
          >
            <Ionicons name="copy" size={20} color={assignmentType === 'custom' ? theme.accent : theme.textSecondary} />
            <Text style={[styles.typeText, { color: assignmentType === 'custom' ? theme.accent : theme.textSecondary }]}>
              Custom Copy
            </Text>
            <Text style={[styles.typeDesc, { color: theme.textMuted }]}>One-time copy, independent</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={`Assign to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
          onPress={handleAssign}
          loading={loading}
          disabled={!selectedProgram || selectedClients.length === 0}
          style={{ marginTop: spacing[6] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: spacing[4], marginBottom: spacing[3] },
  selectedCard: { marginBottom: spacing[3] },
  selectedRow: { flexDirection: 'row', alignItems: 'center' },
  selectedName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, marginBottom: spacing[1] },
  selectedMeta: { fontSize: typography.sizes.sm },
  programScroll: { marginBottom: spacing[3] },
  programCard: { width: 140, marginRight: spacing[3], padding: spacing[3] },
  programName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, marginBottom: spacing[1] },
  programMeta: { fontSize: typography.sizes.xs },
  clientsList: { marginBottom: spacing[3] },
  clientCard: { marginBottom: spacing[2] },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  typeButtons: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  typeButton: { flex: 1, padding: spacing[4], borderRadius: radius.lg, borderWidth: 2, alignItems: 'center' },
  typeText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, marginTop: spacing[2] },
  typeDesc: { fontSize: typography.sizes.xs, marginTop: spacing[1], textAlign: 'center' },
  emptyText: { fontSize: typography.sizes.sm, padding: spacing[2] },
});
