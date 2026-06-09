// Stub — expo-sqlite is native-only.
// On web, all DB calls go through database.web.js (localStorage).
// This stub prevents the Metro bundler from trying to load the native module.
export default {};
export const openDatabaseAsync = () => { throw new Error('expo-sqlite is not supported on web'); };
