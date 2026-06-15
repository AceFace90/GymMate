import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius, colors } from '../theme';
import { MUSCLE_GROUPS, CATEGORIES } from '../data/exercises';
import * as db from '../services/database';
import Card from '../components/Card';
import Button from '../components/Button';
import MuscleTag from '../components/MuscleTag';
import { getExerciseVideo } from '../data/exercise-videos';

const MUSCLE_COLORS = {
  chest: colors.chest, back: colors.back, legs: colors.legs,
  shoulders: colors.shoulders, arms: colors.arms, core: colors.core,
  cardio: colors.cardio, mobility: colors.mobility, full_body: colors.fullBody,
};

export default function ExercisesScreen({ navigation }) {
  const { theme } = useTheme();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Set the "+" button in the nav header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{ marginRight: spacing[4] }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={24} color={theme.accent} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  // Create exercise form
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('chest');
  const [newCategory, setNewCategory] = useState('barbell');
  const [newInstructions, setNewInstructions] = useState('');
  const [creating, setCreating] = useState(false);

  const loadExercises = async () => {
    setLoading(true);
    const data = await db.getExercises({ muscleGroup: filterGroup || undefined, search: search || undefined });
    setExercises(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadExercises(); }, [search, filterGroup]));
  useEffect(() => { loadExercises(); }, [search, filterGroup]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await db.createCustomExercise({ name: newName.trim(), muscleGroup: newGroup, category: newCategory, instructions: newInstructions.trim() });
    setCreating(false);
    setShowCreate(false);
    setNewName(''); setNewInstructions('');
    loadExercises();
  };

  const renderItem = ({ item }) => {
    const hasVideo = !!getExerciseVideo(item.name);

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })} activeOpacity={0.8}>
        <View style={[styles.exRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.accentBar, { backgroundColor: MUSCLE_COLORS[item.muscle_group] || theme.accent }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.exNameRow}>
              <Text style={[styles.exName, { color: theme.text }]}>{item.name}</Text>
              {hasVideo && (
                <Ionicons name="play-circle" size={16} color={theme.accent} style={{ marginLeft: 6 }} />
              )}
            </View>
            <View style={styles.exMeta}>
              <MuscleTag group={item.muscle_group} />
              <Text style={[styles.exCategory, { color: theme.textMuted }]}>{item.category}</Text>
              {item.is_custom ? (
                <View style={[styles.customBadge, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                  <Text style={[styles.customBadgeText, { color: theme.accent }]}>custom</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.headerSection}>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Muscle group filter pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterGroup(null)}
            style={[
              styles.filterChip,
              { borderColor: !filterGroup ? theme.accentBorder : theme.border },
              !filterGroup && { backgroundColor: theme.accentBg },
            ]}
          >
            <Text style={[styles.filterChipText, { color: !filterGroup ? theme.accent : theme.textSecondary }]}>
              All
            </Text>
          </TouchableOpacity>
          {MUSCLE_GROUPS.map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => setFilterGroup(filterGroup === g.id ? null : g.id)}
              style={[
                styles.filterChip,
                { borderColor: filterGroup === g.id ? MUSCLE_COLORS[g.id] : theme.border },
                filterGroup === g.id && { backgroundColor: MUSCLE_COLORS[g.id] + '22' },
              ]}
            >
              <Text style={[styles.filterChipText, { color: filterGroup === g.id ? MUSCLE_COLORS[g.id] : theme.textSecondary }]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Exercise List */}
      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing[8] }} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.flatListContent, { backgroundColor: theme.card }]}
          ItemSeparatorComponent={() => null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No exercises found</Text>
            </View>
          }
        />
      )}

      {/* Create Exercise Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Custom Exercise</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name *</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Exercise name"
              placeholderTextColor={theme.textMuted}
              style={[styles.textInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: spacing[4] }]}>Muscle Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[2] }}>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {MUSCLE_GROUPS.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setNewGroup(g.id)}
                    style={[
                      styles.filterChip,
                      newGroup === g.id && { backgroundColor: MUSCLE_COLORS[g.id] + '22', borderColor: MUSCLE_COLORS[g.id] },
                    ]}
                  >
                    <Text style={[styles.filterChipText, { color: newGroup === g.id ? MUSCLE_COLORS[g.id] : theme.textSecondary }]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: spacing[2] }]}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setNewCategory(c.id)}
                  style={[
                    styles.filterChip,
                    newCategory === c.id && { backgroundColor: theme.accentBg, borderColor: theme.accentBorder },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: newCategory === c.id ? theme.accent : theme.textSecondary }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: spacing[2] }]}>Instructions (optional)</Text>
            <TextInput
              value={newInstructions}
              onChangeText={setNewInstructions}
              placeholder="Describe how to perform this exercise"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.textInput, styles.textarea, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            />

            <Button title="Create Exercise" onPress={handleCreate} loading={creating} style={{ marginTop: spacing[5] }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: {
    paddingBottom: spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  searchInput: { flex: 1, fontSize: typography.sizes.base },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  flatListContent: {
    borderRadius: radius.lg,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentBar: { width: 3, height: 32, borderRadius: 2, marginRight: spacing[3] },
  exNameRow: { flexDirection: 'row', alignItems: 'center' },
  exName: { fontSize: typography.sizes.base, fontWeight: '500' },
  exMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2, flexWrap: 'wrap' },
  exCategory: { fontSize: typography.sizes.xs, textTransform: 'capitalize' },
  customBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[1] },
  customBadgeText: { fontSize: 10, fontWeight: '600' },
  empty: { padding: spacing[8], alignItems: 'center' },
  emptyText: { fontSize: typography.sizes.base },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: '700' },
  modalContent: { padding: spacing[5] },
  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: '500', marginBottom: spacing[1] },
  textInput: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: typography.sizes.base },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
