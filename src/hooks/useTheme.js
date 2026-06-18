import { useState, useEffect, useContext, createContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../theme';

const THEME_KEY = 'gymmate_theme_preference';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((val) => {
        if (val) setPreference(val);
      })
      .catch(() => {
        // ignore storage errors — fall back to system theme
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const resolvedDark =
    preference === 'system'
      ? systemScheme === 'dark'
      : preference === 'dark';

  const theme = getTheme(resolvedDark);

  // On web, paint the html/body background to match the theme so the area
  // behind the safe-area inset (dynamic island / notch) and any overscroll
  // isn't browser-default white in dark mode.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = theme.bg;
    document.body.style.backgroundColor = theme.bg;
  }, [theme.bg]);

  const setTheme = async (pref) => {
    setPreference(pref);
    await AsyncStorage.setItem(THEME_KEY, pref).catch(() => {});
  };

  // Don't block render — show with default theme while preference loads
  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, isDark: resolvedDark, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
