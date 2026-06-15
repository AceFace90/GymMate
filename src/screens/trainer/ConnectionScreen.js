import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { spacing, typography, radius } from '../../theme';
import * as trainerClient from '../../services/trainerClient';
import * as auth from '../../services/auth';

export default function ConnectionScreen({ navigation }) {
  const { theme } = useTheme();
  const [inviteCode, setInviteCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const user = await auth.getCurrentUser();
    setCurrentUser(user);
  }

  async function handleGenerateCode() {
    if (!currentUser) {
      Alert.alert('Error', 'You must be signed in to generate invite codes');
      return;
    }

    console.log('[ConnectionScreen] Generating code for user:', currentUser);
    setLoading(true);

    try {
      const { inviteCode: code } = await trainerClient.sendInvite(
        currentUser.id,
        currentUser.name
      );

      console.log('[ConnectionScreen] Code generated:', code);
      setInviteCode(code);
      setExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000));
    } catch (error) {
      console.error('[ConnectionScreen] Failed to generate invite:', error);
      Alert.alert('Error', `Failed to generate invite code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    if (inviteCode) {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(inviteCode);
      }
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  }

  async function handleShare() {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Join me on GymMate! Use invite code: ${inviteCode}\n\nThis code expires in 24 hours.`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }

  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Connect Client</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Instructions */}
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Generate a unique invite code to share with your client. They'll enter this code in the app to connect with you.
          </Text>
        </Card>

        {/* Generate Code Section */}
        {!inviteCode ? (
          <Card style={styles.generateCard}>
            <Ionicons name="qr-code-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.generateTitle, { color: theme.text }]}>
              Generate Invite Code
            </Text>
            <Text style={[styles.generateText, { color: theme.textSecondary }]}>
              Create a secure code that your client can use to connect with you
            </Text>
            <Button
              title="Generate Code"
              onPress={handleGenerateCode}
              loading={loading}
              style={{ marginTop: spacing[4] }}
            />
          </Card>
        ) : (
          <Card style={styles.codeCard}>
            {isExpired && (
              <View style={[styles.expiredBanner, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={[styles.expiredText, { color: '#f59e0b' }]}>
                  This code has expired
                </Text>
              </View>
            )}

            <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
              Your Invite Code
            </Text>

            <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
              <View style={[styles.codeBox, { backgroundColor: theme.accentBg, borderColor: theme.accent }]}>
                <Text style={[styles.codeText, { color: theme.accent }]}>
                  {inviteCode}
                </Text>
                <Ionicons name="copy-outline" size={20} color={theme.accent} />
              </View>
            </TouchableOpacity>

            {expiresAt && !isExpired && (
              <Text style={[styles.expiryText, { color: theme.textMuted }]}>
                Expires {formatExpiry(expiresAt)}
              </Text>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Copy Code"
                onPress={handleCopyCode}
                variant="secondary"
                style={styles.actionBtn}
              />
              <Button
                title="Share"
                onPress={handleShare}
                variant="primary"
                style={styles.actionBtn}
              />
            </View>

            {isExpired && (
              <Button
                title="Generate New Code"
                onPress={handleGenerateCode}
                loading={loading}
                style={{ marginTop: spacing[3] }}
              />
            )}

            {!isExpired && (
              <Button
                title="Generate Another"
                onPress={handleGenerateCode}
                variant="ghost"
                loading={loading}
                style={{ marginTop: spacing[3] }}
              />
            )}
          </Card>
        )}

        {/* How it Works */}
        <Card style={styles.howCard}>
          <Text style={[styles.howTitle, { color: theme.text }]}>
            How it works
          </Text>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.accentBg }]}>
              <Text style={[styles.stepNumberText, { color: theme.accent }]}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.textSecondary }]}>
              Share the invite code with your client
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.accentBg }]}>
              <Text style={[styles.stepNumberText, { color: theme.accent }]}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.textSecondary }]}>
              Client enters the code in their Profile → Connect with Trainer
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.accentBg }]}>
              <Text style={[styles.stepNumberText, { color: theme.accent }]}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.textSecondary }]}>
              Client appears in your Clients list automatically
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatExpiry(date) {
  const now = new Date();
  const diffMs = date - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMinutes}m`;
  }
  return `in ${diffMinutes}m`;
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
  infoCard: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  generateCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    marginBottom: spacing[4],
  },
  generateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  generateText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  codeCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[6],
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    marginBottom: spacing[4],
  },
  expiredText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  codeLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[2],
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  codeText: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  expiryText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  howCard: {
    marginBottom: spacing[4],
  },
  howTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[4],
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    paddingTop: 4,
  },
});
