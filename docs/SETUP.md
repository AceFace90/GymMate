# GymMate — Setup Guide

Companion app to MacroMate for building gym programs and tracking workouts.

## Quick Start

```bash
cd GymMate
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (iOS/Android), or press `i` for iOS simulator / `a` for Android.

## First Run
On first launch the app seeds ~80 built-in exercises across all muscle groups into a local SQLite database. No internet connection required.

## Features
- **Programs** — Create multi-day workout programs, assign exercises to each day with target sets/reps
- **Active Workout** — Live session logging with weight + reps per set, rest timer with vibration, automatic PR detection
- **Progress** — Weekly volume chart, muscle group breakdown, session history, personal records
- **Exercises** — 80+ built-in exercises searchable/filterable by muscle group and category; add your own custom exercises
- **Profile** — Light / Dark / System theme toggle (matches MacroMate's neon-green design)

## Design System
Matches MacroMate exactly:
- **Accent colour**: `#39ff14` (neon green) in dark mode, `#16a34a` in light mode
- **Dark BG**: `#1a1a1a` / Dark card: `#2a2a2a`
- **Light BG**: `#ffffff` / Light card: `#f9fafb`
- **Theme**: light / dark / system, persisted via AsyncStorage

## Project Structure
```
GymMate/
├── App.js                      # Root — providers + DB init
├── app.json                    # Expo config
├── package.json
├── babel.config.js
└── src/
    ├── theme/index.js          # Color tokens, getTheme(), typography, spacing
    ├── hooks/useTheme.js       # ThemeProvider + useTheme hook
    ├── services/database.js    # expo-sqlite — full schema + all CRUD/analytics
    ├── data/exercises.js       # Built-in exercise library + muscle group enums
    ├── navigation/
    │   └── AppNavigator.js     # Bottom tabs + stack navigators
    ├── components/
    │   ├── Card.js
    │   ├── Button.js
    │   ├── Input.js
    │   └── MuscleTag.js
    └── screens/
        ├── ProgramsScreen.js       # List + create programs
        ├── ProgramDetailScreen.js  # Days, exercises, start workout
        ├── ActiveWorkoutScreen.js  # Live workout logging
        ├── ProgressScreen.js       # Overview / History / Records tabs
        ├── ExercisesScreen.js      # Exercise library + custom creation
        ├── ExerciseDetailScreen.js # Per-exercise history chart
        └── ProfileScreen.js        # Theme + app info
```

## Dependencies
All are standard Expo SDK 51 packages:
- `@react-navigation/native` + `bottom-tabs` + `native-stack`
- `expo-sqlite` — local SQLite database (no backend needed)
- `@expo/vector-icons` — Ionicons
- `react-native-safe-area-context` — notch/home-bar handling
- `@react-native-async-storage/async-storage` — theme preference storage
