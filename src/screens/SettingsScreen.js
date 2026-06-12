import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import Card from '../components/Card';
import { confirmAction } from '../utils/confirm';

const THEME_OPTIONS = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light',  label: 'Light',  icon: 'sunny-outline' },
  { key: 'dark',   label: 'Dark',   icon: 'moon-outline' },
];

export const GEMINI_KEY_STORAGE = 'gymmate_gemini_api_key';

export async function getGeminiKey() {
  return AsyncStorage.getItem(GEMINI_KEY_STORAGE);
}

function Row({ label, value, theme }) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, preference, setTheme } = useTheme();
  const [geminiKey, setGeminiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  useEffect(() => {
    getGeminiKey().then((k) => { if (k) setGeminiKey(k); });
  }, []);

  async function saveKey() {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      confirmAction({ title: 'No key entered', message: 'Paste your Gemini API key to enable AI features.', confirmText: 'OK' });
      return;
    }
    await AsyncStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function removeKey() {
    confirmAction({
      title: 'Remove API key?',
      message: 'AI features will be disabled until you add a key again.',
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        await AsyncStorage.removeItem(GEMINI_KEY_STORAGE);
        setGeminiKey('');
      },
    });
  }

  const hasKey = geminiKey.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Appearance</Text>
        <Card noPad>
          <View style={styles.themeSelector}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setTheme(opt.key)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: preference === opt.key ? theme.accentBg : 'transparent',
                    borderColor: preference === opt.key ? theme.accentBorder : 'transparent',
                  },
                ]}
              >
                <Ionicons name={opt.icon} size={20} color={preference === opt.key ? theme.accent : theme.textMuted} />
                <Text style={[styles.themeLabel, { color: preference === opt.key ? theme.accent : theme.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* AI Features */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>AI Features</Text>
        <Card style={{ gap: spacing[3] }}>
          <View style={styles.aiHeader}>
            <Text style={{ fontSize: 28 }}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiTitle, { color: theme.text }]}>Gemini API Key</Text>
              <Text style={[styles.aiDesc, { color: theme.textSecondary }]}>
                Paste your own Google Gemini API key to unlock AI program generation and photo exercise detection.
                Your key is stored only on this device.
              </Text>
            </View>
          </View>

          {hasKey && (
            <View style={[styles.keyStatus, { backgroundColor: theme.accentBg, borderColor: theme.accentBorder }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
              <Text style={[styles.keyStatusText, { color: theme.accent }]}>AI features unlocked</Text>
            </View>
          )}

          <View style={[styles.keyInputRow, { borderColor: theme.border, backgroundColor: theme.input }]}>
            <TextInput
              style={[styles.keyInput, { color: theme.text }]}
              value={geminiKey}
              onChangeText={(v) => { setGeminiKey(v); setKeySaved(false); }}
              placeholder="AIza..."
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!keyVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setKeyVisible((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={keyVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.keyActions}>
            <TouchableOpacity
              onPress={saveKey}
              style={[styles.saveBtn, { backgroundColor: keySaved ? '#16a34a' : theme.accent }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: theme.isDark ? '#000' : '#fff' }]}>
                {keySaved ? '✓ Saved' : 'Save Key'}
              </Text>
            </TouchableOpacity>
            {hasKey && (
              <TouchableOpacity onPress={removeKey} style={[styles.removeBtn, { borderColor: theme.border }]}>
                <Text style={[styles.removeBtnText, { color: theme.textSecondary }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.keyHint, { color: theme.textMuted }]}>
            Get a free key at aistudio.google.com → Create API key
          </Text>
        </Card>

        {/* About */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>About</Text>
        <Card noPad>
          <Row label="Version" value="1.0.0" theme={theme} />
          <Row label="Exercises" value="80+ built-in" theme={theme} />
          <Row label="Companion App" value="MacroMate" theme={theme} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[2] },
  sectionHeader: {
    fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: spacing[2], marginBottom: spacing[1], marginLeft: spacing[1],
  },
  themeSelector: { flexDirection: 'row', padding: spacing[2], gap: spacing[2] },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radius.md, borderWidth: 1 },
  themeLabel: { fontSize: typography.sizes.xs, fontWeight: '600', marginTop: spacing[1] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: typography.sizes.base },
  rowValue: { fontSize: typography.sizes.sm },
  aiHeader: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  aiTitle: { fontSize: typography.sizes.base, fontWeight: '700', marginBottom: 4 },
  aiDesc: { fontSize: typography.sizes.sm, lineHeight: 20 },
  keyStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[2], borderRadius: radius.md, borderWidth: 1 },
  keyStatusText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  keyInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[3] },
  keyInput: { flex: 1, paddingVertical: spacing[3], fontSize: typography.sizes.sm, fontFamily: 'monospace' },
  eyeBtn: { padding: spacing[2] },
  keyActions: { flexDirection: 'row', gap: spacing[2] },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: radius.md },
  saveBtnText: { fontSize: typography.sizes.base, fontWeight: '700' },
  removeBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  removeBtnText: { fontSize: typography.sizes.base, fontWeight: '600' },
  keyHint: { fontSize: typography.sizes.xs, textAlign: 'center' },
});
