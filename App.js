import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import * as db from './src/services/database';
import { BUILT_IN_EXERCISES } from './src/data/exercises';

function AppContent() {
  useEffect(() => {
    // Initialize database and seed built-in exercises on first launch
    db.initDatabase(BUILT_IN_EXERCISES).catch((e) =>
      console.error('DB init error:', e)
    );
  }, []);

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
