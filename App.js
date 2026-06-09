import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text } from 'react-native';

import { ThemeProvider } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import * as db from './src/services/database';
import { BUILT_IN_EXERCISES } from './src/data/exercises';

// Error boundary — shows a message instead of blank white page on crash
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('GymMate crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', padding: 32 }}>
          <Text style={{ color: '#39ff14', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>GymMate</Text>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Something went wrong loading the app.</Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  useEffect(() => {
    db.initDatabase(BUILT_IN_EXERCISES).catch((e) =>
      console.error('DB init error:', e)
    );
  }, []);

  return <AppNavigator />;
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
