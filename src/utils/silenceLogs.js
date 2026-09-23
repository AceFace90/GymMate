// In production bundles, silence console.log/info/debug — the app ships ~100
// debug logs (some include user/session data) that add noise and overhead and
// can leak information in the browser console. Warnings and errors are kept so
// real problems remain diagnosable. __DEV__ is true under Expo/Metro dev and
// false in production web/native builds.
//
// Imported for its side effect as the first import in App.js so it applies
// before any other module logs.
if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
