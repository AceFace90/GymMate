import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'gymmate_users';
const CURRENT_USER_KEY = 'gymmate_current_user';

export async function getAllUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveCurrentUser(user) {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function clearCurrentUser() {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

export async function createLocalUser(name) {
  const users = await getAllUsers();
  const slug = name.toLowerCase().replace(/\s+/g, '_');
  const user = {
    id: 'local-' + Date.now(),
    name,
    email: `${slug}@gymmate.app`,
    google_id: null,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  return user;
}

export async function deleteUser(id) {
  const users = await getAllUsers();
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u) => u.id !== id)));
  const current = await getCurrentUser();
  if (current?.id === id) await clearCurrentUser();
}

export function isGoogleUser(user) {
  return !!(user?.google_id && !user.google_id.startsWith('local-'));
}

// Called after OAuth callback — server sets cookie, we store user locally
export async function handleGoogleCallback(userData) {
  const users = await getAllUsers();
  const existing = users.findIndex((u) => u.google_id === userData.google_id);
  if (existing >= 0) {
    users[existing] = { ...users[existing], ...userData };
  } else {
    users.push(userData);
  }
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await saveCurrentUser(userData);
  return userData;
}
