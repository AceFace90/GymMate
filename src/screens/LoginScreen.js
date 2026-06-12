import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';
import * as auth from '../services/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gymmate-api.onrender.com';

// Google "G" SVG — same as MacroMate
function GoogleLogo() {
  // Rendered as text fallback on RN — real SVG via react-native-svg if desired
  return <Text style={{ fontSize: 18, marginRight: 8 }}>G</Text>;
}

export default function LoginScreen({ onLogin }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    setUsers(await auth.getAllUsers());
    setLoading(false);
  }

  async function handleUserLogin(user) {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      if (auth.isGoogleUser(user)) {
        handleGoogleSignIn();
        return;
      }
      await onLogin(user);
    } catch (e) {
      alert('Login failed: ' + e.message);
      setLoggingIn(false);
    }
  }

  function handleGoogleSignIn() {
    Linking.openURL(`${API_URL}/auth/google`);
  }

  async function handleNameSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const user = await auth.createLocalUser(trimmed);
      await onLogin(user);
    } catch (e) {
      alert('Failed to create profile: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Title */}
        <View style={s.header}>
          <Image source={require('../../assets/logo.png')} style={s.logoImage} resizeMode="contain" />
          <Text style={s.subtitle}>AI-Powered Gym & Workout Tracking</Text>
        </View>

        {/* Feature highlights */}
        <View style={s.featureCard}>
          {[
            { icon: '📸', title: 'Smart Machine Recognition', desc: 'Photo a machine to log your workout instantly' },
            { icon: '🤖', title: 'AI Program Builder', desc: 'Generate a custom program for your goals' },
            { icon: '📈', title: 'Track Progress', desc: 'PRs, volume trends, and muscle group breakdown' },
          ].map((f) => (
            <View key={f.title} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Auth UI */}
        {!showNameInput ? (
          <>
            {users.length === 0 && (
              <>
                <TouchableOpacity style={s.primaryBtn} onPress={() => setShowNameInput(true)} activeOpacity={0.85}>
                  <Ionicons name="rocket-outline" size={20} color={theme.isDark ? '#000' : '#fff'} />
                  <Text style={s.primaryBtnText}>Quick Start</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.85}>
                  <Text style={s.googleG}>G</Text>
                  <Text style={s.googleBtnText}>Sign in with Google</Text>
                </TouchableOpacity>

                <Text style={s.syncNote}>Sync across devices · Secure cloud backup</Text>
              </>
            )}

            {users.length === 1 && (
              <>
                <TouchableOpacity
                  style={[s.primaryBtn, loggingIn && s.disabled]}
                  onPress={() => handleUserLogin(users[0])}
                  activeOpacity={0.85}
                  disabled={loggingIn}
                >
                  <Ionicons name="person" size={20} color={theme.isDark ? '#000' : '#fff'} />
                  <Text style={s.primaryBtnText}>
                    {loggingIn ? 'Logging in…' : `Let's Go, ${users[0].name}!`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.85}>
                  <Text style={s.googleG}>G</Text>
                  <Text style={s.googleBtnText}>Sign in with Google</Text>
                </TouchableOpacity>

                <Text style={s.syncNote}>Sync across devices · Secure cloud backup</Text>

                <TouchableOpacity onPress={() => setShowNameInput(true)} style={s.manageBtn}>
                  <Text style={s.manageBtnText}>⚙️ Manage Users</Text>
                </TouchableOpacity>
              </>
            )}

            {users.length > 1 && (
              <>
                <Text style={[s.sectionLabel, { color: theme.text }]}>Select User:</Text>
                <View style={[s.userList, { borderColor: theme.border }]}>
                  {users.map((u, i) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[s.userRow, i < users.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
                      onPress={() => handleUserLogin(u)}
                      disabled={loggingIn}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={[s.userName, { color: theme.text }]}>{u.name}</Text>
                        {u.email ? <Text style={[s.userEmail, { color: theme.textSecondary }]}>{u.email}</Text> : null}
                      </View>
                      <Text style={{ color: theme.accent, fontSize: 18 }}>→</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[s.userRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                    onPress={() => setShowNameInput(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: theme.accent, fontWeight: '600' }}>+ Create New User</Text>
                    <Text style={{ color: theme.accent, fontSize: 18 }}>→</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        ) : (
          /* Name input */
          <View style={s.nameForm}>
            <Text style={[s.welcomeTitle, { color: theme.text }]}>Welcome to GymMate! 💪</Text>
            <Text style={[s.welcomeSub, { color: theme.textSecondary }]}>What should we call you?</Text>

            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />

            <TouchableOpacity
              style={[s.primaryBtn, submitting && s.disabled]}
              onPress={handleNameSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>{submitting ? 'Getting Started…' : 'Continue'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowNameInput(false)} style={s.backBtn}>
              <Text style={[s.backBtnText, { color: theme.textSecondary }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={[s.hint, { color: theme.textMuted }]}>
              You can set goals and preferences in your profile later.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/privacy-policy`)}>
            <Text style={[s.footerLink, { color: theme.textMuted }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={[s.footerDot, { color: theme.textMuted }]}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/terms-of-service`)}>
            <Text style={[s.footerLink, { color: theme.textMuted }]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, padding: spacing[5], justifyContent: 'center' },

    header: { alignItems: 'center', marginBottom: spacing[6] },
    logoImage: { width: 220, height: 147 },
    subtitle: { fontSize: typography.sizes.base, color: theme.textSecondary, marginTop: spacing[2] },

    featureCard: {
      backgroundColor: theme.card,
      borderRadius: radius.xl,
      padding: spacing[5],
      marginBottom: spacing[6],
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing[4],
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
    featureIcon: { fontSize: 24, width: 32, textAlign: 'center' },
    featureTitle: { fontSize: typography.sizes.base, fontWeight: '700', color: theme.text },
    featureDesc: { fontSize: typography.sizes.sm, color: theme.textSecondary, marginTop: 2 },

    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      backgroundColor: theme.accent,
      borderRadius: radius.xl,
      paddingVertical: spacing[4],
      marginBottom: spacing[3],
    },
    primaryBtnText: {
      fontSize: typography.sizes.lg,
      fontWeight: '700',
      color: theme.isDark ? '#000' : '#fff',
    },
    disabled: { opacity: 0.5 },

    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      backgroundColor: '#fff',
      borderRadius: radius.xl,
      paddingVertical: spacing[4],
      marginBottom: spacing[4],
      borderWidth: 1,
      borderColor: '#d1d5db',
    },
    googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4', width: 24, textAlign: 'center' },
    googleBtnText: { fontSize: typography.sizes.lg, fontWeight: '700', color: '#1f2937' },

    syncNote: {
      textAlign: 'center',
      fontSize: typography.sizes.sm,
      color: theme.textMuted,
      marginBottom: spacing[3],
    },

    manageBtn: { alignItems: 'center', marginTop: spacing[2] },
    manageBtnText: { fontSize: typography.sizes.sm, color: theme.textMuted },

    sectionLabel: { fontSize: typography.sizes.lg, fontWeight: '600', marginBottom: spacing[3] },
    userList: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: spacing[4] },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      backgroundColor: theme.card,
    },
    userName: { fontSize: typography.sizes.base, fontWeight: '600' },
    userEmail: { fontSize: typography.sizes.sm, marginTop: 2 },

    nameForm: { gap: spacing[3] },
    welcomeTitle: { fontSize: typography.sizes.xl, fontWeight: '700' },
    welcomeSub: { fontSize: typography.sizes.base },
    input: {
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      fontSize: typography.sizes.lg,
    },
    backBtn: { alignItems: 'center', paddingVertical: spacing[2] },
    backBtnText: { fontSize: typography.sizes.base },
    hint: { fontSize: typography.sizes.xs, textAlign: 'center' },

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing[2],
      marginTop: spacing[8],
      paddingTop: spacing[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    footerLink: { fontSize: typography.sizes.xs },
    footerDot: { fontSize: typography.sizes.xs },
  });
}
