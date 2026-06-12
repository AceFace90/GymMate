import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import * as db from '../services/database';
import { identifyExercise } from '../services/gemini';
import { getGeminiKey } from '../screens/SettingsScreen';
import { candidatesFromVision } from '../utils/matchExercise';
import MuscleTag from './MuscleTag';
import Button from './Button';

// Smart machine recognition: snap/pick a photo of a machine or movement,
// Gemini identifies it, we fuzzy-match against the exercise DB, user confirms.
// onPick(exerciseRow) is called with the chosen DB exercise.
export default function ExerciseScannerModal({ visible, onClose, onPick }) {
  const { theme } = useTheme();
  const [stage, setStage] = useState('start'); // start | analyzing | result | error
  const [imageUri, setImageUri] = useState(null);
  const [vision, setVision] = useState(null);     // raw Gemini result
  const [candidates, setCandidates] = useState([]); // matched DB rows
  const [error, setError] = useState('');

  const reset = () => {
    setStage('start'); setImageUri(null); setVision(null); setCandidates([]); setError('');
  };

  const handleClose = () => { reset(); onClose?.(); };

  async function pickImage(fromCamera) {
    setError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Camera/photo permission denied.');
      setStage('error');
      return;
    }
    const opts = { base64: true, quality: 0.5, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    analyze(asset.base64, asset.mimeType || 'image/jpeg');
  }

  async function analyze(base64, mimeType) {
    setStage('analyzing');
    try {
      const key = await getGeminiKey();
      if (!key) throw new Error('NO_KEY');
      const result = await identifyExercise(base64, mimeType);
      setVision(result);
      const exercises = await db.getExercises();
      setCandidates(candidatesFromVision(result, exercises));
      setStage('result');
    } catch (e) {
      setError(e.message === 'NO_KEY' ? 'Add your Gemini API key in Settings → AI Features first.' : e.message);
      setStage('error');
    }
  }

  const confidencePct = vision?.confidence != null ? Math.round(vision.confidence * 100) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.modal, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>📸 Scan Exercise</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : null}

          {/* START */}
          {stage === 'start' && (
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Snap a photo of a machine or movement and we'll identify the exercise for you.
              </Text>
              <Button title="📷  Take Photo" onPress={() => pickImage(true)} size="lg" style={{ marginTop: spacing[4] }} />
              <Button title="🖼  Choose from Library" variant="secondary" onPress={() => pickImage(false)} size="lg" style={{ marginTop: spacing[3] }} />
            </>
          )}

          {/* ANALYZING */}
          {stage === 'analyzing' && (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.accent} size="large" />
              <Text style={[styles.hint, { color: theme.textSecondary, marginTop: spacing[3] }]}>Identifying exercise…</Text>
            </View>
          )}

          {/* RESULT */}
          {stage === 'result' && (
            <>
              <View style={[styles.resultBox, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
                <Text style={[styles.resultLabel, { color: theme.textMuted }]}>IDENTIFIED</Text>
                <Text style={[styles.resultName, { color: theme.text }]}>{vision?.exercise || 'Unknown'}</Text>
                {confidencePct != null ? (
                  <Text style={[styles.resultConf, { color: theme.textSecondary }]}>{confidencePct}% confidence</Text>
                ) : null}
              </View>

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                {candidates.length ? 'Tap the closest match to add it:' : 'No close match in your library.'}
              </Text>

              {candidates.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => { onPick?.(ex); handleClose(); }}
                  style={[styles.candidate, { borderColor: theme.border, backgroundColor: theme.card }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.candidateName, { color: theme.text }]}>{ex.name}</Text>
                    <MuscleTag group={ex.muscle_group} style={{ marginTop: 2 }} />
                  </View>
                  <Ionicons name="add-circle" size={22} color={theme.accent} />
                </TouchableOpacity>
              ))}

              <Button title="Scan Again" variant="secondary" onPress={reset} style={{ marginTop: spacing[4] }} />
            </>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
              <Button title="Try Again" onPress={reset} style={{ marginTop: spacing[4] }} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  title: { fontSize: typography.sizes.xl, fontWeight: '700' },
  content: { padding: spacing[5] },
  preview: { width: '100%', height: 200, borderRadius: radius.lg, marginBottom: spacing[4] },
  hint: { fontSize: typography.sizes.base, textAlign: 'center', lineHeight: 22 },
  centered: { alignItems: 'center', paddingVertical: spacing[8] },
  resultBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing[4], alignItems: 'center', marginBottom: spacing[4] },
  resultLabel: { fontSize: typography.sizes.xs, fontWeight: '700', letterSpacing: 1 },
  resultName: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[1] },
  resultConf: { fontSize: typography.sizes.sm, marginTop: 2 },
  sectionLabel: { fontSize: typography.sizes.sm, fontWeight: '600', marginBottom: spacing[2] },
  candidate: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing[3], marginBottom: spacing[2] },
  candidateName: { fontSize: typography.sizes.base, fontWeight: '600' },
  errorText: { fontSize: typography.sizes.base, textAlign: 'center', marginTop: spacing[3], paddingHorizontal: spacing[4] },
});
