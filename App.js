import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text } from 'react-native';

import { ThemeProvider } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import * as db from './src/services/database';
import * as auth from './src/services/auth';
import { BUILT_IN_EXERCISES } from './src/data/exercises';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('GymMate crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', padding: 32 }}>
          <Text style={{ color: '#39ff14', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>GymMate</Text>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Something went wrong.</Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await db.initDatabase(BUILT_IN_EXERCISES).catch((e) => console.error('DB init:', e));
      const current = await auth.getCurrentUser();
      setUser(current);
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogin(userData) {
    await auth.saveCurrentUser(userData);
    setUser(userData);
  }

  if (loading) return null;

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppNavigator user={user} onLogout={async () => { await auth.clearCurrentUser(); setUser(null); }} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
