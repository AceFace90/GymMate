# GymMate — Native iOS Co-Publishing Plan

**Date:** 2026-09-23
**Goal:** ship a native iOS app from the same repo/core codebase as the web PWA.

## Feasibility verdict

**Yes — right architecture, ~70% there structurally, but native has never actually run.** The codebase already assumes a web/native split (`Platform.OS` guards, `.web.js` variants, an `expo-sqlite` stub). But there's no `eas.json`, no build pipeline, placeholder bundle IDs, and several native-breaking paths. Native `database.js` is a complete, well-written SQLite impl that is currently aliased out at the Metro layer, so it has almost certainly never executed on a device.

**Strategy:** single Expo codebase, add native targets via **EAS Build + Continuous Native Generation (`expo prebuild`)**. Do **not** fork or eject. UI, navigation, theme, hooks, and ~90% of business logic are shared.

## Blockers & required changes

### Critical (app won't function)
1. **Metro stubs `expo-sqlite` for all platforms** (`metro.config.js:8-12`, `extraNodeModules` isn't platform-scoped) → native persistence fails. Gate the alias to web only in a `resolveRequest`.
2. **Google sign-in is web-popup only** (`auth.js:98` `signInWithPopup`). Native needs `expo-auth-session` + `signInWithCredential` (or `@react-native-google-signin` + `@react-native-firebase/auth`), `initializeAuth` with `getReactNativePersistence(AsyncStorage)`, iOS URL scheme / reversed client ID + `GoogleService-Info.plist`, and **Sign in with Apple** (App Store policy).
3. **Unguarded `alert()` → crashes** in `LoginScreen.js:66,81,112,125`, `ProfileScreen.js:93,100,164,166`. Route through cross-platform helpers.
4. **`window.location.reload()` / `localStorage`** unguarded in `ProfileScreen.js:97,151` and throughout `demoSeed.js:22-232` (demo mode is web-only).

### Medium
5. `resetPRsForExercise` missing on native → `ProgressScreen.js:130` crashes.
6. No native auto-backup (`database.js:112-113` no-ops) → workouts lost if app killed pre-backup.
7. **Cross-platform blob incompatibility** — reconcile before shipping native (see EVALUATION-2026-09.md P2).
8. Native `DatePicker` placeholder → `@react-native-community/datetimepicker`.
9. Exercise videos use web `<iframe>` → `react-native-webview`.
10. Clipboard no-op on native (`ConnectionScreen.js:56`) → `expo-clipboard`.
11. `react-native-linear-gradient` (transitive) → needs dev build/prebuild, not Expo Go.

### Config gaps
- `app.json`: real `ios.bundleIdentifier` (currently `com.yourname.gymmate`), URL schemes, decide `supportsTablet`.
- No `eas.json`; no Apple Developer account ($99/yr).
- Native updates via **EAS Update** (OTA JS) or App Store; PWA `version.json` banner already web-gated.

## Implementation plan (phased)

**Phase A — Make native run (foundation)**
1. Gate the `expo-sqlite` Metro alias to web only.
2. Port `markSessionPRs` + `resetPRsForExercise` to native; wire native auto-backup; fix native PR over-flagging + `deleteProgram` FK.
3. **Reconcile the two DBs to one backup blob format/version** (shared serializer or single module + storage adapter). Highest-value refactor; benefits both platforms.
4. Replace unguarded `alert()`/`window`/`localStorage` with cross-platform helpers.

**Phase B — Native auth:** Google OAuth via `expo-auth-session` + `signInWithCredential`, AsyncStorage persistence, Sign in with Apple.

**Phase C — Native parity:** `react-native-webview` (video), native `DatePicker`, `expo-clipboard`, verify `expo-image-picker` on device.

**Phase D — Build & config:** `npx expo install` new modules; real bundle ID; `eas build:configure`; `expo prebuild` (CNG).

**Phase E — Ship:** `eas build -p ios --profile preview` → TestFlight; device QA (first real run of native DB); App Store Connect metadata/screenshots/privacy labels/Apple sign-in; `eas submit -p ios`; add EAS Update for OTA.

## Effort & cost

| Phase | Effort (solo) |
|---|---|
| A — foundation + DB reconcile | 4–6 days |
| B — native auth (Google + Apple) | 3–5 days |
| C — parity (video/date/clipboard) | 2–3 days |
| D — EAS/prebuild/config | 1–2 days |
| E — device QA + App Store | 3–5 days + review latency |
| **Total** | **~3–4 focused weeks** + Apple Developer ($99/yr) |

**Biggest risk:** the native DB has never executed — budget device-testing time in Phase E. **Do the DB reconciliation (Phase A/3) first**, or you'll debug two diverging databases at once.
