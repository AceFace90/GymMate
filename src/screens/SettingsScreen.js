import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput, Alert, Platform, Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { getGeminiKey, setGeminiKey as persistGeminiKey, clearGeminiKey } from '../services/geminiKey';
import { deleteAllUserData, deleteAccount, isGoogleUser } from '../services/auth';
import { fontFamily, breakpoints } from '../theme';
import { confirmAction } from '../utils/confirm';
import Icon from '../components/Icon';

const THEME_OPTIONS = [
  { key: 'system', label: 'System', icon: 'phone' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];
const UNITS_OPTIONS = [
  { key: 'metric', label: 'Metric (kg, cm)' },
  { key: 'imperial', label: 'Imperial (lbs, ft/in)' },
];

const PRIVACY_URL = 'https://aceface90.github.io/GymMate/privacy-policy.html';

function Segmented({ options, value, onSelect }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.segTrack, { backgroundColor: theme.fill }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onSelect(o.key)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.segItem, active && [styles.segActive, { backgroundColor: theme.isDark ? '#636366' : '#ffffff' }]]}
          >
            <Text style={[styles.segText, { color: theme.text, fontWeight: active ? '600' : '400', fontFamily }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Section({ title, footer, children }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily }]}>{title.toUpperCase()}</Text> : null}
      <View style={[styles.group, { backgroundColor: theme.card }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: theme.textSecondary, fontFamily }]}>{footer}</Text> : null}
    </View>
  );
}

// Row with a hairline separator inset 16 from the left (omitted on the last row).
function Row({ last, children, style, onPress, accessibilityLabel }) {
  const { theme } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.row, style]}
    >
      {children}
      {!last && <View style={[styles.sep, { backgroundColor: theme.separator }]} />}
    </Wrapper>
  );
}

export default function SettingsScreen({ navigation, user, onLogout }) {
  const { theme, preference, setTheme } = useTheme();
  const { units, setUnits } = useUnits();
  const { width } = useWindowDimensions();
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const signedInWithGoogle = isGoogleUser(user);

  useEffect(() => {
    getGeminiKey().then((k) => setHasKey(!!k));
  }, []);

  const saveKey = async () => {
    const k = keyInput.trim();
    if (!k) return;
    await persistGeminiKey(k);
    setKeyInput('');
    setHasKey(true);
  };
  const removeKey = () => confirmAction({
    title: 'Remove API key?',
    message: 'AI features will be disabled until you add a key again.',
    confirmText: 'Remove',
    destructive: true,
    onConfirm: async () => { await clearGeminiKey(); setHasKey(false); },
  });

  const fail = (e) => {
    const msg = e?.message ?? String(e);
    if (Platform.OS === 'web') window.alert(`Couldn't complete that: ${msg}`);
    else Alert.alert('Error', msg);
  };
  const reload = () => { if (Platform.OS === 'web') window.location.reload(); };

  const handleDeleteData = () => confirmAction({
    title: 'Delete all data?',
    message: 'This permanently removes every workout, program and your profile from this device and your account. Your sign-in stays active. There is no undo.',
    confirmText: 'Delete All Data',
    destructive: true,
    onConfirm: () => deleteAllUserData().then(({ cloudOk }) => {
      if (!cloudOk) fail(new Error('Local data was deleted, but some cloud data could not be removed.'));
      reload();
    }).catch(fail),
  });
  const handleDeleteAccount = () => confirmAction({
    title: 'Delete your account?',
    message: 'This permanently deletes your account and all synced data. There is no undo.',
    confirmText: 'Delete Account',
    destructive: true,
    onConfirm: () => deleteAccount().then(() => onLogout?.()).catch(fail),
  });

  const name = user?.name || 'Athlete';
  const email = user?.email && !user.email.endsWith('@gymmate.app') ? user.email : '';
  const bottomPad = width < breakpoints.desktop ? 24 : 40;
  const link = (text, url) => (
    <Text style={{ color: theme.accent, fontWeight: '600' }} accessibilityRole="link" onPress={() => Linking.openURL(url)}>{text}</Text>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}>
        <View style={styles.inner}>
          <Text style={[styles.title, { color: theme.text, fontFamily }]} accessibilityRole="header">Settings</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily }]}>Your profile, appearance and account.</Text>

          <View style={[styles.group, styles.profileCard, { backgroundColor: theme.card }]}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <Text style={[styles.avatarText, { color: theme.accentContrast, fontFamily }]}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.text, fontFamily }]} numberOfLines={1}>{name}</Text>
              {email ? <Text style={[styles.profileEmail, { color: theme.textSecondary, fontFamily }]} numberOfLines={1}>{email}</Text> : null}
            </View>
          </View>

          <Section
            title="Account"
            footer={signedInWithGoogle ? 'Your data syncs to this account and is available on any device you sign into.' : 'This profile is stored on this device only.'}
          >
            <Row last onPress={onLogout} accessibilityLabel="Log out">
              <Text style={[styles.rowLabel, { color: theme.danger, fontFamily }]}>Log Out</Text>
            </Row>
          </Section>

          <Section title="About you">
            <Row last onPress={() => navigation.navigate('Profile')} accessibilityLabel="Body and goals">
              <Text style={[styles.rowLabel, { flex: 1, color: theme.text, fontFamily }]}>Body & goals</Text>
              <Icon name="chevronRight" size={16} color={theme.textSecondary} />
            </Row>
          </Section>

          <Section title="Appearance">
            {THEME_OPTIONS.map((o, i) => (
              <Row key={o.key} last={i === THEME_OPTIONS.length - 1} onPress={() => setTheme(o.key)} accessibilityLabel={o.label}>
                <Icon name={o.icon} size={20} color={theme.accent} />
                <Text style={[styles.rowLabel, { flex: 1, color: theme.text, fontFamily }]}>{o.label}</Text>
                {preference === o.key ? <Icon name="check" size={20} color={theme.accent} /> : null}
              </Row>
            ))}
          </Section>

          <Section title="Units">
            <Row last style={styles.segRow}>
              <Segmented options={UNITS_OPTIONS} value={units} onSelect={setUnits} />
            </Row>
          </Section>

          <Section
            title="AI features"
            footer="Paste your own Gemini API key to enable AI program generation and photo exercise detection. Stored only on this device, never synced."
          >
            <Row last={!hasKey && false}>
              <Icon name="key" size={20} color={theme.textSecondary} />
              <Text style={[styles.rowLabel, { flex: 1, color: theme.text, fontFamily }]}>Gemini API key</Text>
              {hasKey ? (
                <View style={styles.savedWrap}>
                  <Icon name="check" size={16} color={theme.accent} />
                  <Text style={[styles.rowValue, { color: theme.accent, fontFamily }]}>Saved</Text>
                </View>
              ) : null}
            </Row>
            {hasKey ? (
              <Row last onPress={removeKey} accessibilityLabel="Remove Gemini key">
                <Icon name="trash" size={20} color={theme.danger} />
                <Text style={[styles.rowLabel, { color: theme.danger, fontFamily }]}>Remove</Text>
              </Row>
            ) : (
              <Row last style={styles.keyInputRow}>
                <TextInput
                  value={keyInput}
                  onChangeText={setKeyInput}
                  placeholder="AIza…"
                  placeholderTextColor={theme.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  accessibilityLabel="Gemini API key"
                  style={[styles.input, { backgroundColor: theme.input, color: theme.text, fontFamily }]}
                />
                <TouchableOpacity
                  onPress={saveKey}
                  disabled={!keyInput.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Save key"
                  style={[styles.saveBtn, { backgroundColor: theme.accent, opacity: keyInput.trim() ? 1 : 0.4 }]}
                >
                  <Text style={[styles.saveBtnText, { color: theme.accentContrast, fontFamily }]}>Save</Text>
                </TouchableOpacity>
              </Row>
            )}
          </Section>

          <Section
            title="Your data"
            footer="Delete All Data permanently removes every workout, program and your profile from this device and your account (your sign-in stays active). Delete Account removes the account itself and all synced data. There is no undo."
          >
            <Row last={!signedInWithGoogle} onPress={handleDeleteData} accessibilityLabel="Delete all data">
              <Icon name="trash" size={20} color={theme.danger} />
              <Text style={[styles.rowLabel, { color: theme.danger, fontFamily }]}>Delete All Data</Text>
            </Row>
            {signedInWithGoogle ? (
              <Row last onPress={handleDeleteAccount} accessibilityLabel="Delete account">
                <Icon name="warning" size={20} color={theme.danger} />
                <Text style={[styles.rowLabel, { color: theme.danger, fontFamily }]}>Delete Account</Text>
              </Row>
            ) : null}
          </Section>

          <Section title="About">
            <Row>
              <Text style={[styles.rowLabel, { color: theme.text, fontFamily }]}>Version</Text>
              <Text style={[styles.rowValue, { color: theme.textSecondary, fontFamily, flex: 1, textAlign: 'right' }]}>1.2.0</Text>
            </Row>
            <Row>
              <Text style={[styles.rowLabel, { color: theme.text, fontFamily }]}>Companion apps</Text>
              <Text style={[styles.rowValue, { color: theme.textSecondary, fontFamily, flex: 1, textAlign: 'right' }]}>
                {link('MacroMate', 'https://aceface90.github.io/MacroMate/')}{' · '}{link('LabMate', 'https://aceface90.github.io/LabMate/')}
              </Text>
            </Row>
            <Row last onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityLabel="Privacy Policy">
              <Text style={[styles.rowLabel, { flex: 1, color: theme.text, fontFamily }]}>Privacy Policy</Text>
              <Icon name="chevronRight" size={16} color={theme.textSecondary} />
            </Row>
          </Section>

          <Section title="Credits">
            <View style={styles.creditsBody}>
              <Text style={[styles.credits, { color: theme.textSecondary, fontFamily }]}>
                {'Exercise demonstration videos provided by '}
                {link('ATP Personal Training', 'https://www.youtube.com/@atppersonaltraining4506/featured')}
                {' via YouTube. Calorie and BMI figures are general estimates, not medical advice.'}
              </Text>
            </View>
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8 },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 34, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 2, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 13, letterSpacing: 0.3, marginLeft: 16, marginBottom: 6 },
  group: { borderRadius: 26, overflow: 'hidden' },
  footer: { fontSize: 13, lineHeight: 18, marginTop: 6, paddingHorizontal: 16 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  sep: { position: 'absolute', left: 16, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 17 },
  rowValue: { fontSize: 17 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24 },
  profileName: { fontSize: 22, fontWeight: '700' },
  profileEmail: { fontSize: 15, marginTop: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '600' },
  segRow: { paddingVertical: 8 },
  segTrack: { flex: 1, flexDirection: 'row', borderRadius: 9, padding: 2 },
  segItem: { flex: 1, minHeight: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segActive: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segText: { fontSize: 14 },
  savedWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  keyInputRow: { paddingVertical: 8 },
  input: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, borderWidth: 0 },
  saveBtn: { height: 44, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '600' },
  creditsBody: { padding: 16 },
  credits: { fontSize: 13, lineHeight: 19 },
});
