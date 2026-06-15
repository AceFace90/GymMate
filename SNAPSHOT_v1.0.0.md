# GymMate v1.0.0 - State Snapshot

**Date:** 2026-06-15  
**Commit:** `af637f4` - fix: backup profile data and units preference to cloud  
**Git Tag:** `v1.0.0`  
**Purpose:** Pre-PT-collaboration baseline for rollback reference

---

## Summary

Stable PWA fitness tracking app with:
- ✅ User authentication (Firebase + Google OAuth)
- ✅ Program management (create, edit, start workouts)
- ✅ Live workout logging with PR tracking
- ✅ Progress dashboard (charts, PRs, history)
- ✅ Exercise library (151 exercises + 93 video integrations)
- ✅ Units system (metric/imperial with auto-detection)
- ✅ Cloud backup/restore via Firestore
- ✅ Multi-user support with data namespacing

**Total:** 39 source files, ~7,310 lines of code

---

## Database Schema (SQLite v1)

```sql
-- Migration v1 (lines 16-87 in src/services/database.js)

exercises
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── name TEXT NOT NULL UNIQUE
├── muscle_group TEXT NOT NULL  -- chest|back|legs|shoulders|arms|core|cardio|full_body
├── category TEXT NOT NULL      -- barbell|dumbbell|machine|cable|bodyweight|cardio
├── instructions TEXT
├── is_custom INTEGER DEFAULT 0
└── created_at TEXT DEFAULT (datetime('now'))

programs
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── name TEXT NOT NULL
├── description TEXT
├── days_per_week INTEGER DEFAULT 3
├── is_active INTEGER DEFAULT 0
└── created_at TEXT DEFAULT (datetime('now'))

program_days
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE
├── day_number INTEGER NOT NULL
├── name TEXT NOT NULL
└── sort_order INTEGER DEFAULT 0

program_exercises
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── program_day_id INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE
├── exercise_id INTEGER NOT NULL REFERENCES exercises(id)
├── sets INTEGER DEFAULT 3
├── reps TEXT DEFAULT '8-12'
├── rest_seconds INTEGER DEFAULT 90
├── notes TEXT
└── sort_order INTEGER DEFAULT 0

workout_sessions
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── program_id INTEGER REFERENCES programs(id)
├── program_day_id INTEGER REFERENCES program_days(id)
├── day_name TEXT
├── started_at TEXT DEFAULT (datetime('now'))
├── completed_at TEXT
├── duration_seconds INTEGER
└── notes TEXT

session_sets
├── id INTEGER PRIMARY KEY AUTOINCREMENT
├── session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE
├── exercise_id INTEGER NOT NULL REFERENCES exercises(id)
├── exercise_name TEXT NOT NULL
├── set_number INTEGER NOT NULL
├── weight_kg REAL
├── reps INTEGER
├── rpe REAL
├── completed INTEGER DEFAULT 0
├── is_pr INTEGER DEFAULT 0
└── logged_at TEXT DEFAULT (datetime('now'))

schema_version
└── version INTEGER PRIMARY KEY
```

**Web Storage Keys** (namespaced per user via `activeUser.nsKey()`):
- `gymmate_exercises`
- `gymmate_programs`
- `gymmate_programDays`
- `gymmate_programExercises`
- `gymmate_sessions`
- `gymmate_sessionSets`
- `gymmate_counters`

---

## User Model (AsyncStorage)

**Location:** `src/services/auth.js`

```javascript
// Stored at gymmate_users (global, not namespaced)
{
  id: string,              // 'local-<timestamp>' or 'google-<firebaseUid>'
  name: string,
  email: string | null,
  google_id: string | null,
  photo_url: string,       // Google OAuth only
  created_at: string,      // ISO datetime
}

// Current user pointer at gymmate_current_user
```

**User Types:**
1. Local users (`id: 'local-*'`, `google_id: null`)
2. Google OAuth users (`id: 'google-*'`, `google_id: <firebase-uid>`)
3. Demo user (seeded data)

---

## Profile/Biometrics Data (AsyncStorage)

**Location:** `src/screens/ProfileScreen.js`  
**Storage Key:** `gymmate_biometrics` (namespaced per user)

```javascript
{
  name: string,
  age: string,
  sex: 'male' | 'female',
  heightCm: string,           // Stored in cm, displayed based on units preference
  weightKg: string,           // Stored in kg, displayed based on units preference
  bodyFatPct: string,
  activityLevel: string,      // sedentary|light|moderate|active|very_active
  primaryGoal: string,        // weight_loss|muscle_gain|strength|endurance|general
  isPregnant: boolean,
  trimester: string,
  cycleLastPeriodDate: string,
  cycleLength: number,        // Default: 28
}
```

**Also in AsyncStorage (backed up):**
- `gymmate_units` - 'metric' | 'imperial'

---

## Firestore Structure

**Collection:** `users/{uid}`

```javascript
{
  payload: {
    version: 1,
    data: {
      exercises: [...rows],
      programs: [...rows],
      programDays: [...rows],
      programExercises: [...rows],
      sessions: [...rows],
      sessionSets: [...rows],
      counters: { exercises: N, programs: N, ... },
      biometrics: { ... },     // Profile data
    },
    asyncStorage: {
      gymmate_biometrics: '{"name":"..."}',
      gymmate_units: '"metric"',
    },
  },
  updatedAt: '2026-06-15T12:34:56.789Z',
}
```

**Sync Model:** Backup/restore (not live per-write)
- On sign-in: Compare cloud vs local timestamps → push or pull
- On sign-out: Push local data to cloud

---

## File Structure

```
src/
├── navigation/
│   └── AppNavigator.js                # Bottom tabs + stack navigators
├── screens/
│   ├── LoginScreen.js                 # Google OAuth + local profiles + demo
│   ├── ProgramsScreen.js              # List + create programs (manual/AI)
│   ├── ProgramDetailScreen.js         # Edit program: days + exercises
│   ├── ActiveWorkoutScreen.js         # Live workout logging + timer
│   ├── ProgressScreen.js              # Dashboard + charts + PRs + history
│   ├── ExercisesScreen.js             # Browse/search exercise library
│   ├── ExerciseDetailScreen.js        # Exercise info + video + history chart
│   ├── ProfileScreen.js               # Biometrics + settings + data wipe
│   └── SettingsScreen.js              # Theme + units + Gemini key
├── components/
│   ├── Card.js                        # Themed container
│   ├── Button.js                      # Primary/secondary/ghost variants
│   ├── Input.js                       # Themed text input
│   ├── MuscleTag.js                   # Colored chip for muscle group
│   ├── YouTubeEmbed.js                # Video player component
│   └── biometrics/
│       └── UniversalFields.js         # Height/weight inputs with unit conversion
├── hooks/
│   ├── useTheme.js                    # ThemeProvider + dark/light mode
│   └── useUnits.js                    # UnitsProvider + metric/imperial conversion
├── theme/
│   └── index.js                       # Color tokens + typography + spacing
├── services/
│   ├── database.js                    # SQLite (native) - all queries
│   ├── database.web.js                # LocalStorage-backed (web platform)
│   ├── firebase.js                    # Firebase config
│   ├── auth.js                        # Login/logout + user management
│   ├── cloudSync.js                   # Firestore backup/restore
│   ├── activeUser.js                  # User namespacing (nsKey)
│   └── gemini.js                      # AI program generation
└── data/
    ├── exercises.js                   # 151 built-in exercises
    └── exercise-videos.js             # 93 YouTube video mappings
```

---

## Core Features Inventory

### 1. Authentication & User Management
- **Files:** `auth.js`, `LoginScreen.js`, `activeUser.js`
- **Capabilities:**
  - Google OAuth via Firebase
  - Local profiles (multi-user on same device)
  - Demo mode with seeded data
  - Profile switching
  - User deletion (local only, not cloud)

### 2. Program Management
- **Files:** `ProgramsScreen.js`, `ProgramDetailScreen.js`, `database.js`
- **Capabilities:**
  - Create programs (manual or AI-generated)
  - Multi-day program structure
  - Add/reorder exercises within days
  - Set targets: sets, reps, rest periods
  - Mark program as active (one at a time)
  - Delete programs

### 3. Workout Logging
- **Files:** `ActiveWorkoutScreen.js`, `database.js`
- **Capabilities:**
  - Start workout from program day
  - Live timer (duration tracking)
  - Set-by-set logging: weight, reps, RPE
  - Rest timer (auto-starts after each set)
  - Shows last set data as reference
  - Auto-detects PRs (personal records)
  - Add ad-hoc exercises mid-workout
  - Complete workout with notes

### 4. Progress Tracking
- **Files:** `ProgressScreen.js`, `database.js`
- **Capabilities:**
  - Dashboard: weekly stats (workouts, sets, volume, minutes)
  - 7-day activity heatmap
  - 12-week volume chart
  - 30-day muscle group breakdown
  - Personal records (PRs) list with reset option
  - Workout history with delete
  - All charts support metric/imperial units

### 5. Exercise Library
- **Files:** `ExercisesScreen.js`, `ExerciseDetailScreen.js`, `exercises.js`, `exercise-videos.js`
- **Capabilities:**
  - 151 built-in exercises
  - 93 YouTube video integrations
  - Filter by muscle group (8 categories)
  - Search by name
  - Exercise detail: stats, video, history chart, instructions
  - Custom exercises (can add your own)

### 6. Units System
- **Files:** `useUnits.js`, `UniversalFields.js`, `SettingsScreen.js`
- **Capabilities:**
  - Metric (kg, cm) or Imperial (lbs, ft/in)
  - Auto-detects from system locale (US → imperial, else metric)
  - User can toggle in Settings
  - All weights stored in kg internally (convert on display/input)
  - All heights stored in cm internally
  - Persists per user account
  - Backed up to cloud

### 7. Cloud Sync
- **Files:** `cloudSync.js`, `firebase.js`
- **Capabilities:**
  - Full data backup to Firestore on sign-out
  - Restore on sign-in (new device or cleared data)
  - Timestamp-based reconciliation (push vs pull decision)
  - Backs up: all SQLite tables + biometrics + units preference
  - One Firestore document per user (`users/{uid}`)

### 8. Theme System
- **Files:** `useTheme.js`, `theme/index.js`
- **Capabilities:**
  - Dark mode (default) and light mode
  - Neon green accent (#39ff14 dark, #16a34a light)
  - Consistent color tokens (bg, card, border, text, accent)
  - Typography scales
  - Spacing and radius constants
  - Toggle in Settings

### 9. AI Features (Gemini)
- **Files:** `gemini.js`, `ProgramsScreen.js`
- **Capabilities:**
  - Generate workout programs from prompt
  - User provides API key (stored in AsyncStorage)
  - Supports goal, days/week, equipment constraints
  - Uses gemini-1.5-flash model
  - Gated behind API key check

---

## Dependencies (package.json v1.0.0)

**Core:**
- `expo` ~51.0.0
- `react` 18.2.0
- `react-native` 0.74.1
- `react-native-web` ~0.19.10

**Navigation:**
- `@react-navigation/native` ^6.1.17
- `@react-navigation/bottom-tabs` ^6.5.20
- `@react-navigation/native-stack` ^6.9.26
- `@react-navigation/stack` ^6.3.29

**Storage:**
- `expo-sqlite` ~14.0.3
- `@react-native-async-storage/async-storage` 1.23.1

**Auth & Backend:**
- `firebase` ^12.14.0

**UI/Charts:**
- `@expo/vector-icons` ^14.0.0
- `react-native-gifted-charts` ^1.4.77
- `react-native-svg` 15.2.0
- `react-native-linear-gradient` ^2.8.3

**Other:**
- `expo-image-picker` ~15.1.0 (for AI photo features - planned)
- `expo-status-bar` ~1.12.1
- `react-native-gesture-handler` ~2.16.1
- `react-native-safe-area-context` 4.10.1
- `react-native-screens` 3.31.1

---

## Key Patterns & Conventions

### 1. Data Namespacing
**Every user's data is isolated via `activeUser.nsKey()`:**
```javascript
// src/services/activeUser.js
nsKey('gymmate_sessions')
// Returns: 'gymmate_u_google-abc123_sessions' (if logged in)
// Returns: 'gymmate_sessions' (if no active user)
```

**Must call `setActiveUserId(id)` BEFORE any data access:**
- On app init (App.js line 42)
- On login (App.js line 53, auth.js line 85)
- On demo login (LoginScreen line 105)

### 2. Screen Skeleton
```javascript
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

export default function MyScreen() {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* content */}
    </SafeAreaView>
  );
}
```

### 3. Database Queries
**All DB calls go through `src/services/database.js`:**
```javascript
import * as db from '../services/database';

// Example usage:
const programs = await db.getPrograms();
const sessionId = await db.startSession({ programId, programDayId, dayName });
await db.logSet({ sessionId, exerciseId, weightKg, reps });
```

### 4. Weight/Height Storage
- **Always stored in metric** (kg, cm) internally
- **Convert on display/input** via `useUnits()` hook
- Never change internal storage units

### 5. Theme Usage
**Never hardcode colors:**
```javascript
const { theme } = useTheme();
<View style={{ backgroundColor: theme.card, borderColor: theme.border }}>
```

### 6. Migration Pattern
**Add new migrations to MIGRATIONS array:**
```javascript
const MIGRATIONS = [
  `v1 schema...`,
  `v2 changes...`,  // New migrations append here
];
```

**Never edit existing migration strings** - only append new ones.

---

## Data Flow Examples

### Creating & Starting a Workout
```
User creates program
  ↓ db.createProgram()
  ↓ db.addProgramDay() × N
  ↓ db.addExerciseToDay() × M
User starts workout
  ↓ db.startSession() → creates workout_sessions row
  ↓ ActiveWorkoutScreen loads
User logs sets
  ↓ db.logSet() per set → inserts session_sets rows
  ↓ Auto-checks PR via MAX query
  ↓ Rest timer starts
User finishes workout
  ↓ db.completeSession() → sets completed_at timestamp
  ↓ cloudSync.backupToCloud() (if Google user)
Dashboard updates
  ↓ ProgressScreen refetches stats on focus
```

### Cloud Sync on Sign-In
```
User signs in with Google
  ↓ auth.signInWithGoogle()
  ↓ setActiveUserId(user.id)
  ↓ cloudSync.syncOnSignIn()
    ↓ Check if cloud doc exists
    ↓ Compare timestamps (local vs cloud)
    ↓ Decision:
      - Cloud empty → push local up
      - Local empty → pull cloud down
      - Both exist → use SYNC_MARKER to decide
    ↓ importAllData() or backupToCloud()
  ↓ Navigate to app
```

---

## Known Limitations (v1.0.0)

1. **Single-user programs** - No sharing or collaboration features
2. **No trainer/client relationships** - All data is per-user only
3. **Backup/restore model** - Cloud sync is not real-time (only on sign-in/out)
4. **No exercise form videos** - Only 93 exercises have YouTube links
5. **No payment processing** - App is free, no monetization
6. **No admin dashboard** - User management is client-side only
7. **No exercise variations tracking** - Can't log "incline bench" vs "flat bench" separately unless separate exercises
8. **Web-only deployment** - No native iOS/Android builds yet

---

## Rollback Instructions

### If You Want to Revert to v1.0.0:

**Option 1: Tag Checkout (View Only)**
```bash
git checkout v1.0.0
npm start
# Now at v1.0.0 snapshot (detached HEAD)
# To return: git checkout main
```

**Option 2: Hard Reset (Destructive)**
```bash
git checkout main
git reset --hard v1.0.0
git push --force origin main
# WARNING: This erases all commits after v1.0.0
```

**Option 3: Revert Merge (Safe)**
```bash
git checkout main
git revert -m 1 <merge-commit-hash>
git push origin main
# Creates new commit that undoes the merge
```

**Option 4: Delete Feature Branch (Before Merge)**
```bash
git checkout main
git branch -D feature/pt-client-collaboration
# Feature branch deleted, main untouched
```

---

## Testing Checklist (Pre-Tag Verification)

✅ User can sign in with Google  
✅ User can create local profile  
✅ User can create program manually  
✅ User can add exercises to program days  
✅ User can start workout and log sets  
✅ User can complete workout  
✅ Dashboard shows correct workout count  
✅ Progress charts display data  
✅ PRs auto-detected and displayed  
✅ Units toggle works (metric ↔ imperial)  
✅ Weight/height conversions accurate  
✅ Cloud backup on sign-out successful  
✅ Cloud restore on new device works  
✅ Exercise videos play  
✅ Theme toggle works (dark ↔ light)  
✅ Multi-user switching works  
✅ Demo mode loads correctly

---

## Performance Baseline

**Metrics (as of v1.0.0):**
- Total lines of code: ~7,310
- Source files: 39
- Built-in exercises: 151
- Video integrations: 93
- Database tables: 6
- Schema version: 1
- Bundle size (web): ~2.5MB (uncompressed)
- Lighthouse score: Not measured (TODO for future)

---

## Git Information

**Current Branch:** `main`  
**Last Commit:** `af637f4` - fix: backup profile data and units preference to cloud  
**Tag:** `v1.0.0`  
**Remote:** `github-personal:AceFace90/gymmate.git`  
**Deploy URL:** https://aceface90.github.io/gymmate  
**Actions:** https://github.com/AceFace90/gymmate/actions

---

## Next Steps (v1.1.0 - PT Collaboration)

**Planned Features:**
- Trainer/client relationships with mutual consent
- Program templates (trainer library)
- Program assignment (trainer → client)
- Client progress viewing (trainer dashboard)
- PT verification (self-declaration with disclaimer)
- Invite code system (no in-app directory)
- Read-only assigned programs for clients
- AI program customization for specific clients

**Branch:** `feature/pt-client-collaboration`  
**Target Version:** `v1.1.0`

---

**End of Snapshot - v1.0.0**
