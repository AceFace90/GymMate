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

export default function ProgramsScreen({ navigation }) {
  const { theme } = useTheme();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDays, setNewDays] = useState('3');
  const [creating, setCreating] = useState(false);

  const loadPrograms = async () => {
    setLoading(true);
    const data = await db.getPrograms();
    setPrograms(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadPrograms(); }, []));

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
          <Ionicons name="add" size={24} color={theme.accent} />
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
