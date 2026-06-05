import { useState, useEffect, useContext, createContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../theme';

const THEME_KEY = 'gymmate_theme_preference';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState('system'); // 'light' | 'dark' | 'system'
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val) setPreference(val);
      setLoaded(true);
    });
  }, []);

  const resolvedDark =
    preference === 'system'
      ? systemScheme === 'dark'
      : preference === 'dark';

  const theme = getTheme(resolvedDark);

  const setTheme = async (pref) => {
    setPreference(pref);
    await AsyncStorage.setItem(THEME_KEY, pref);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, isDark: resolvedDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
