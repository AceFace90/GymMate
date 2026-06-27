# GymMate — Architecture Brief for Contributors

## What is GymMate?

A gym workout tracking web app, deployed as a PWA (installable on iPhone home screen) at:
**https://aceface90.github.io/gymmate**

Sister project to MacroMate (nutrition tracker). Same owner, same design system, same tech patterns.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React Native (Expo ~51), rendered to web via `react-native-web` |
| Navigation | `@react-navigation` — bottom tabs + per-tab stack navigators |
| Local storage | `expo-sqlite` (native) / `localStorage`-backed store (web) |
| Cloud sync | Firebase (Auth + Firestore) — per-user backup & cross-device sync |
| Icons | `@expo/vector-icons` (Ionicons) |
| Deployment | GitHub Pages via GitHub Actions (`AceFace90/gymmate`) |
| AI | Google Gemini — photo → exercise ID, program generation |
| Auth | Google OAuth via Firebase; demo + local profiles also supported |

---

## Documentation

- **[DATA_SYNC_ARCHITECTURE.md](docs/DATA_SYNC_ARCHITECTURE.md)** — Data sync, cloud backup, feature matrix (Google vs local), data flow diagrams
- **[workout-progress-sync-implementation.md](docs/workout-progress-sync-implementation.md)** — Workout/progress sync internals
- **[pt-client-sync-handoff.md](docs/pt-client-sync-handoff.md)** — Trainer↔client feature background

---

## Repository Layout

```
GymMate/
├── App.js                      # Root — ErrorBoundary, ThemeProvider, AppNavigator
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js     # Bottom tabs: Home | Programs | Exercises | (Clients) | Profile
│   │                           #   Clients tab shows only for trainer-role users.
│   │                           #   ProgramsStack includes AssignProgram (trainer only).
│   ├── screens/
│   │   ├── HomeScreen.js           # Dashboard: this-week activity rings, last session, quick start
│   │   ├── ProgramsScreen.js       # List + create programs (unified for PT and athlete)
│   │   ├── ProgramDetailScreen.js  # View/edit days + exercises. Trainer: Assign + Push Updates buttons.
│   │   ├── ActiveWorkoutScreen.js  # Live workout: timer, sets/reps input, rest timer, delete set
│   │   ├── ProgressScreen.js       # Tabs: Overview (charts/rings), History, Records (PRs)
│   │   ├── WorkoutDetailScreen.js  # Past-session view: summary + per-exercise set tables, edit/delete sets
│   │   ├── ExercisesScreen.js      # Browse/search exercise library
│   │   ├── ExerciseDetailScreen.js # Exercise info + history chart
│   │   ├── ProfileScreen.js        # User settings, trainer connections, trainer-mode toggle
│   │   ├── SettingsScreen.js       # Units, preferences, Gemini API key, account actions
│   │   ├── trainer/                # Trainer-role screens (dashboard, clients, assign)
│   │   │   ├── TrainerDashboardScreen.js   # Client list + stats
│   │   │   ├── ClientDetailScreen.js       # Client detail, assigned programs, revoke
│   │   │   ├── ClientWorkoutDetailScreen.js
│   │   │   ├── ConnectionScreen.js         # Generate invite codes
│   │   │   └── AssignProgramScreen.js      # Assign any PT program to clients (Linked or Custom Copy)
│   │   └── client/
│   │       └── ConnectTrainerScreen.js     # Enter invite code, supports multiple trainers
│   ├── components/
│   │   ├── Card.js             # Themed container card
│   │   ├── Button.js           # Primary/secondary/ghost variants
│   │   ├── Input.js            # Themed text input
│   │   ├── MuscleTag.js        # Coloured chip for muscle group labels
│   │   ├── ActivityRings.js    # Apple-Watch-style progress rings (Home/Progress)
│   │   ├── DatePicker.js       # Cross-platform date picker
│   │   ├── ExerciseScannerModal.js # Photo → exercise identification (Gemini)
│   │   ├── ConnectionStatusBadge.js / InviteCodeInput.js # Trainer↔client linking UI
│   ├── hooks/
│   │   ├── useTheme.js         # ThemeProvider + useTheme() hook
│   │   └── useUnits.js         # Unit system (kg/lb), formatWeight, conversions
│   ├── theme/
│   │   └── index.js            # Color tokens, typography, spacing, radius
│   ├── services/
│   │   ├── database.js         # All SQLite calls (native) — schema v2
│   │   ├── database.web.js     # Web implementation (localStorage-backed)
│   │   ├── auth.js / firebase.js     # Google OAuth + Firebase
│   │   ├── cloudSync.js        # Firestore blob backup/restore (programs, exercises, biometrics)
│   │   ├── workoutSync.js      # workout_sessions_cloud sync + restore (sessions/sets)
│   │   ├── activeUser.js       # Per-user data namespacing
│   │   ├── trainerClient.js    # Trainer↔client connection. getMyTrainers() returns array (multi-trainer).
│   │   ├── gemini.js           # Gemini API (photo → exercise, program generation)
│   │   └── programTemplates.js # Firestore template/assignment management (invisible to UI)
│   ├── utils/
│   │   ├── confirm.js          # Cross-platform confirm dialog
│   │   ├── biometrics.js / cyclePhase.js / matchExercise.js
│   └── data/
│       ├── exercises.js        # BUILT_IN_EXERCISES seed data array
│       ├── exercise-videos.js  # Exercise → video URL mapping
│       └── demoSeed.js         # Demo-account seed data
├── web/
│   └── index.html              # Web entry point
├── firestore.rules             # Firestore security rules
├── .github/workflows/
│   └── deploy.yml              # Expo export → GitHub Pages on push to main
└── package.json
```

---

## Design System

**Do not introduce new colors or spacing values.** All contributors must use the existing tokens from `src/theme/index.js`.

```js
// Always get theme via hook — never hardcode colors
import { useTheme } from '../hooks/useTheme';
const { theme } = useTheme();

theme.bg            // page background  (#1a1a1a dark / #ffffff light)
theme.card          // card background  (#2a2a2a dark / #f9fafb light)
theme.border        // border color
theme.text          // primary text
theme.textSecondary
theme.textMuted
theme.accent        // neon green (#39ff14 dark / #16a34a light)
theme.accentBg      // semi-transparent green — highlighted rows
theme.accentBorder
theme.isDark        // boolean
```

```js
import { spacing, typography, radius } from '../theme';
spacing[4]             // 16px
typography.sizes.base  // 15px
radius.md              // 10px
```

---

## Database (SQLite / localStorage)

All DB calls go through `src/services/database.js`.

### Schema (v2)

```
exercises         id, name, muscle_group, category, instructions, is_custom
programs          id, name, description, days_per_week, is_active,
                  created_by_user_id, is_template, linked_template_id
program_days      id, program_id, day_number, name, sort_order
program_exercises id, program_day_id, exercise_id, sets, reps, rest_seconds, notes, sort_order
workout_sessions  id, program_id, program_day_id, day_name, started_at, completed_at,
                  duration_seconds, notes
session_sets      id, session_id, exercise_id, exercise_name, set_number, weight_kg,
                  reps, rpe, completed, is_pr
schema_version    version
```

**Key conventions:**
- `programs.is_template = 1` → hidden from Programs list (PT-internal, invisible plumbing)
- `programs.linked_template_id` → set on assigned programs; makes them read-only in UI
- `getPrograms()` filters out `is_template = 1` rows — never shows template-backed programs
- All timestamps use `datetime('now', 'localtime')` — never bare `datetime('now')` (UTC)

### Adding a schema migration

Add a new SQL string to the `MIGRATIONS` array in `database.js`. Never edit existing entries.

---

## Firestore Collections

| Collection | Purpose | Who writes | Who reads |
|---|---|---|---|
| `users/{uid}` | Full blob backup: programs, exercises, biometrics | User's own device | User's own device |
| `workout_sessions_cloud/{id}` | Per-session workout data | Client (on finish/edit) | Client + their trainer(s) |
| `trainer_clients/{id}` | PT↔client relationships | Trainer (create), either (revoke) | Both parties |
| `program_templates/{id}` | Invisible sync layer for assigned programs | Trainer (via assign/push) | Trainer |
| `program_assignments/{id}` | Programs assigned to clients | Trainer | Client (sync), Trainer |

**Blob backup (`users/{uid}`) deliberately excludes sessions** — sessions live exclusively in `workout_sessions_cloud`. On sign-in, `restoreSessionsFromCloud()` in `workoutSync.js` rebuilds local sessions from Firestore.

---

## Trainer / Client Feature Model

**Role gating:** Clients tab only renders when `user.role === 'trainer'` (checked in AppNavigator).

**Multiple trainers:** A client can connect to multiple trainers. `trainerClient.getMyTrainers()` returns an array. Each trainer's assignments are scoped by `trainerId`.

**Program assignment flow:**
1. PT creates/edits program in Programs tab (same screen as athletes)
2. PT opens program → taps "Assign to Clients" (trainer-only button)
3. `AssignProgramScreen` loads PT's own programs (filtered by `created_by_user_id`)
4. On assign: app silently upserts a `program_templates` Firestore doc (keyed `tpl_{trainerId}_prog_{programId}`), then writes a `program_assignments` doc
5. "Push Updates to Clients" re-upserts the template and overwrites all linked assignments
6. Client syncs via `syncAssignedPrograms()` in `ProgramsScreen` — reads `program_assignments`, writes local programs with `linked_template_id` set (read-only in UI)

**Security:** `AssignProgramScreen` only shows programs where `created_by_user_id === currentUser.id` — a PT cannot assign programs given to them by another trainer.

---

## Screen Skeleton

```jsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export default function MyScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* content */}
    </SafeAreaView>
  );
}
```

> ⚠️ **`navigation` prop (web gotcha).** Always declare `navigation` in props. Omitting it on web causes `window.navigation.navigate()` to fire a real URL change instead of a stack push.

---

## Contributing Rules

1. **Never hardcode colors** — always use `theme.*` from `useTheme()`
2. **Never write to the DB outside of `database.js`** — add a new exported function there
3. **New schema changes go in MIGRATIONS array** — never mutate existing entries
4. **Timestamps: always use `datetime('now', 'localtime')`** — bare `datetime('now')` stores UTC, breaking date queries for non-UTC users
5. **No new npm packages without checking** — native-only packages break the web build
6. **Test on web** — run `npm run web` and check in Safari (simulates iPhone)
7. **Screens fetch their own data on focus** via `useFocusEffect`

---

## Running Locally

```bash
cd /path/to/GymMate
npm install
npm run web       # opens in browser at localhost:8081
npm run build:web # builds to dist/ (same as CI)
```

Push to `main` → GitHub Actions → `expo export --platform web` → GitHub Pages.
