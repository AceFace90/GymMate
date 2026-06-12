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
| Navigation | `@react-navigation` — bottom tabs + stack navigators |
| Local storage | `expo-sqlite` (SQLite in-browser via WASM on web) |
| Icons | `@expo/vector-icons` (Ionicons) |
| Deployment | GitHub Pages via GitHub Actions (`AceFace90/gymmate`) |
| AI (planned) | Google Gemini (gemini-1.5-flash) — user provides API key |
| Auth (planned) | Google OAuth via GCP — same pattern as MacroMate |
| Backend (planned) | Express.js server for OAuth + AI proxy + cloud sync |

---

## Repository Layout

```
GymMate/
├── App.js                      # Root — ErrorBoundary, ThemeProvider, AppNavigator
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js     # Bottom tabs: Programs | Progress | Exercises | Profile
│   ├── screens/
│   │   ├── ProgramsScreen.js       # List + create programs
│   │   ├── ProgramDetailScreen.js  # View/edit days and exercises in a program
│   │   ├── ActiveWorkoutScreen.js  # Live workout: timer, sets/reps input, rest timer
│   │   ├── ProgressScreen.js       # Charts: weekly volume, PRs, muscle group breakdown
│   │   ├── ExercisesScreen.js      # Browse/search exercise library
│   │   ├── ExerciseDetailScreen.js # Exercise info + history chart
│   │   └── ProfileScreen.js        # User settings, theme toggle
│   ├── components/
│   │   ├── Card.js             # Themed container card
│   │   ├── Button.js           # Primary/secondary/ghost variants
│   │   ├── Input.js            # Themed text input
│   │   └── MuscleTag.js        # Coloured chip for muscle group labels
│   ├── hooks/
│   │   └── useTheme.js         # ThemeProvider + useTheme() hook
│   ├── theme/
│   │   └── index.js            # Color tokens, typography, spacing, radius
│   ├── services/
│   │   ├── database.js         # All SQLite calls (native)
│   │   └── database.web.js     # Web stub / WASM override if needed
│   └── data/
│       └── exercises.js        # BUILT_IN_EXERCISES seed data array
├── web/
│   └── index.html              # Web entry point (add PWA meta here)
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

// Then use:
theme.bg          // page background  (#1a1a1a dark / #ffffff light)
theme.card        // card background  (#2a2a2a dark / #f9fafb light)
theme.border      // border color
theme.text        // primary text
theme.textSecondary
theme.textMuted
theme.accent      // neon green (#39ff14 dark / #16a34a light) — buttons, active states
theme.accentBg    // semi-transparent green — for highlighted rows
theme.accentBorder
theme.isDark      // boolean
```

```js
// Spacing and typography — import from theme
import { spacing, typography, radius } from '../theme';
spacing[4]  // 16px
typography.sizes.base  // 15px
radius.md   // 10px
```

**Screen skeleton pattern** (copy this for every new screen):

```jsx
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

---

## Database (SQLite)

All DB calls go through `src/services/database.js`. Import like:

```js
import * as db from '../services/database';
```

### Current Schema (v1)

```
exercises         id, name, muscle_group, category, instructions, is_custom
programs          id, name, description, days_per_week, is_active
program_days      id, program_id, day_number, name, sort_order
program_exercises id, program_day_id, exercise_id, sets, reps, rest_seconds, notes, sort_order
workout_sessions  id, program_id, program_day_id, day_name, started_at, completed_at, duration_seconds, notes
session_sets      id, session_id, exercise_id, exercise_name, set_number, weight_kg, reps, rpe, completed, is_pr
schema_version    version
```

### muscle_group values
`chest | back | legs | shoulders | arms | core | cardio | full_body`

### category values
`barbell | dumbbell | machine | cable | bodyweight | cardio`

### Adding a schema migration

Add a new SQL string to the `MIGRATIONS` array in `database.js`. The migration runner applies only versions newer than what's stored in `schema_version`. Never edit existing migration entries.

---

## Adding a New Screen

1. Create `src/screens/YourScreen.js` using the skeleton above.
2. Add it to `AppNavigator.js` — either as a new tab (rare) or pushed onto an existing stack.
3. Add a tab icon name from [Ionicons](https://ionic.io/ionicons) to the `icons` map in `AppNavigator.js`.

---

## Planned Features (build these next)

### 1. PWA / iPhone Home Screen Install
**File:** `web/index.html` and new `web/manifest.json`

Add to `web/index.html` `<head>`:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GymMate">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icon-192.png">
```

`manifest.json` needs: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#1a1a1a"`, `background_color: "#1a1a1a"`, icons array. Owner will supply icon image files.

---

### 2. Google OAuth Login

**Pattern:** Mirror MacroMate exactly.
- Backend: Express server at `server/index.js`
- Auth: `passport` + `passport-google-oauth20`
- Sessions: `express-session` backed by Neon PostgreSQL (`connect-pg-simple`)
- OAuth callback URL: `https://aceface90.github.io/gymmate/auth/google/callback` (or custom domain)
- Login screen: `src/screens/LoginScreen.js` — same layout as MacroMate's LoginPage:
  - App title in accent green
  - Feature list card (3 bullet points with emoji icons)
  - "Let's Go, [Name]!" green button (guest/quick-start)
  - "Sign in with Google" white outlined button
  - "Sync across devices · Secure cloud backup" footer text

When user is logged in, store `userId` in AsyncStorage and pass to all DB sync calls.

---

### 3. AI: Photo → Exercise Identification

**Trigger:** Camera button in `ActiveWorkoutScreen` (and optionally a standalone "Log from Photo" FAB on the Programs tab).

**Flow:**
1. User taps camera icon → device camera opens (`expo-image-picker`)
2. Image sent to backend `/api/identify-exercise` as base64
3. Backend calls Gemini vision API:
```js
const result = await model.generateContent([
  {
    inlineData: { data: imageBase64, mimeType: 'image/jpeg' }
  },
  `You are a gym equipment expert. Identify the exercise machine or equipment in this photo.
   Return JSON: { "exercise": "Lat Pulldown", "muscleGroup": "back", "category": "machine", "confidence": 0.9 }`
]);
```
4. App shows a confirmation modal: "Looks like: **Lat Pulldown**" with muscle tag + Yes/No/Change
5. On confirm → opens set logging UI (weight + reps inputs, same as ActiveWorkoutScreen)
6. Logs via `db.logSet()`

**Gemini model:** `gemini-1.5-flash` (fast, cheap, handles images well)
**API key:** Stored server-side in `.env` as `GEMINI_API_KEY` — never exposed to client

---

### 4. AI: Generate Gym Program

**Trigger:** "Generate with AI" button on `ProgramsScreen` (next to manual create).

**Flow:**
1. Modal asks: Goal (Strength / Hypertrophy / Weight Loss / General Fitness), Days per week (2–6), Equipment (Full gym / Dumbbells only / Bodyweight)
2. POST to `/api/generate-program` with those params
3. Backend prompts Gemini:
```
Generate a ${daysPerWeek}-day ${goal} gym program.
Return JSON: {
  "name": "string",
  "description": "string",
  "days": [
    {
      "name": "Day 1 - Push",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "6-8", "restSeconds": 120, "muscleGroup": "chest", "category": "barbell" }
      ]
    }
  ]
}
Use only exercises from this list: [${exerciseNames.join(', ')}]
```
4. App creates program + days + exercises via existing `db.createProgram()` / `db.addProgramDay()` / `db.addExerciseToDay()` calls
5. Navigate to the new ProgramDetailScreen

---

### 5. Video Library Links (future — schema only for now)

Add to schema migration v2:
```sql
ALTER TABLE exercises ADD COLUMN video_url TEXT;
```

`ExerciseDetailScreen` will render a "Watch" button if `video_url` is set. No player needed — open URL in browser via `Linking.openURL()`.

---

## Contributing Rules

1. **Never hardcode colors** — always use `theme.*` from `useTheme()`
2. **Never write to the DB outside of `database.js`** — add a new exported function there
3. **New schema changes go in MIGRATIONS array** — never mutate existing entries
4. **No new npm packages without checking** — the bundle runs in a browser; native-only packages break the web build
5. **Test on web** — run `npm run web` and check in Safari (simulates iPhone). The GitHub Actions build will fail if web export breaks.
6. **Keep screens self-contained** — screens fetch their own data on focus via `useFocusEffect`

---

## Running Locally

```bash
cd /path/to/GymMate
npm install
npm run web       # opens in browser at localhost:8081
npm run build:web # builds to dist/ (same as CI)
```

Push to `main` → GitHub Actions runs `expo export --platform web` → deploys to GitHub Pages automatically.

---

## Environment Variables (when backend is added)

```
GEMINI_API_KEY=         # Google AI Studio key
GOOGLE_CLIENT_ID=       # GCP OAuth client ID
GOOGLE_CLIENT_SECRET=   # GCP OAuth client secret
DATABASE_URL=           # Neon PostgreSQL connection string
SESSION_SECRET=         # Random string for express-session
```

Never commit `.env`. Add to `.gitignore`.
