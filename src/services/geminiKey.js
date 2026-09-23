// Storage for the user's BYO Gemini API key. Lives in the service layer so that
// other services (gemini.js) and components can read it without importing from a
// screen (screens/SettingsScreen), which was a layering violation.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEMINI_KEY_STORAGE = 'gymmate_gemini_api_key';

export function getGeminiKey() {
  return AsyncStorage.getItem(GEMINI_KEY_STORAGE);
}

export function setGeminiKey(key) {
  return AsyncStorage.setItem(GEMINI_KEY_STORAGE, key);
}

export function clearGeminiKey() {
  return AsyncStorage.removeItem(GEMINI_KEY_STORAGE);
}
