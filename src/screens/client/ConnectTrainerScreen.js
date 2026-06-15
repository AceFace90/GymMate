import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import InviteCodeInput from '../../components/InviteCodeInput';
import { spacing, typography } from '../../theme';
import * as trainerClient from '../../services/trainerClient';
import * as auth from '../../services/auth';

export default function ConnectTrainerScreen({ navigation }) {
  const { theme } = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [isValid, setIsValid] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const user = await auth.getCurrentUser();
    setCurrentUser(user);
  }

  async function handleVerifyCode() {
    if (inviteCode.length !== 6) {
      setIsValid(false);
      setErrorMessage('Code must be 6 characters');
      return;
    }

    setLoading(true);

    try {
      const invite = await trainerClient.findInvite(inviteCode);
      setIsValid(true);
      setTrainerInfo(invite);
      setErrorMessage('');
    } catch (error) {
      setIsValid(false);
      setErrorMessage(error.message || 'Invalid invite code');
      setTrainerInfo(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!trainerInfo || !currentUser) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setLoading(true);

    try {
      await trainerClient.acceptInvite(
        trainerInfo.relationshipId,
        currentUser.id,
        currentUser.name
      );

      Alert.alert(
        'Connected!',
        `You're now connected with ${trainerInfo.trainerName}. They can now assign programs and view your progress.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to accept invite:', error);
      Alert.alert('Error', 'Failed to connect with trainer');
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
          <Text style={[styles.title, { color: theme.text }]}>Connect with Trainer</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Secure Connection
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Your trainer will be able to see your workouts, progress, and profile. You can disconnect at any time.
            </Text>
          </View>
        </Card>

        {/* Invite Code Input */}
        <Text style={[styles.label, { color: theme.text }]}>Enter Invite Code</Text>
        <InviteCodeInput
          value={inviteCode}
          onChangeText={(text) => {
            setInviteCode(text);
            setIsValid(null);
            setTrainerInfo(null);
          }}
          isValid={isValid}
          errorMessage={errorMessage}
        />

        {inviteCode.length === 6 && !trainerInfo && (
          <Button
            title="Verify Code"
            onPress={handleVerifyCode}
            loading={loading}
            style={{ marginTop: spacing[4] }}
          />
        )}

        {/* Trainer Preview */}
        {trainerInfo && (
          <Card style={styles.trainerCard}>
            <View style={styles.trainerHeader}>
              <View style={[styles.avatar, { backgroundColor: theme.accentBg }]}>
                <Ionicons name="person" size={32} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trainerName, { color: theme.text }]}>
                  {trainerInfo.trainerName}
                </Text>
                <Text style={[styles.trainerRole, { color: theme.textSecondary }]}>
                  Personal Trainer
                </Text>
              </View>
            </View>

            {/* What They'll See */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.permissionsTitle, { color: theme.text }]}>
              What they'll see:
            </Text>

            <View style={styles.permission}>
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
              <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
                Your workout history and progress
              </Text>
            </View>

            <View style={styles.permission}>
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
              <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
                Your personal records and stats
              </Text>
            </View>

            <View style={styles.permission}>
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
              <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
                Your profile and goals
              </Text>
            </View>

            <Button
              title="Accept & Connect"
              onPress={handleAccept}
              loading={loading}
              style={{ marginTop: spacing[4] }}
            />
          </Card>
        )}

        {/* Help Section */}
        <Card style={styles.helpCard}>
          <Text style={[styles.helpTitle, { color: theme.text }]}>
            Need help?
          </Text>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Ask your trainer to generate an invite code from their Clients tab. The code is valid for 24 hours.
          </Text>
        </Card>
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
  infoCard: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  infoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[1],
  },
  infoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[3],
  },
  trainerCard: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  trainerRole: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    marginVertical: spacing[4],
  },
  permissionsTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[3],
  },
  permission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  permissionText: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  helpCard: {
    marginBottom: spacing[4],
  },
  helpTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[2],
  },
  helpText: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
});
