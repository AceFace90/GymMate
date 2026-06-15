# Units Implementation - Work In Progress

## ✅ Completed (Commit: 7122e02)

### Infrastructure
- Created `src/hooks/useUnits.js` with UnitsProvider context
- Auto-detects system locale (US → imperial, rest of world → metric)
- Conversion utilities: `kgToLbs()`, `lbsToKg()`, `cmToFeet()`, `feetToCm()`
- Helper functions: `formatWeight()`, `formatHeight()`, `parseWeight()`, `displayWeight()`
- Persists user preference in AsyncStorage per account

### UI
- Settings → Units section with Metric/Imperial toggle
- Shows unit examples (kg, cm vs lbs, ft/in)
- Labels updated in Profile biometrics (Height, Weight)
- ActiveWorkout weight column header shows kg/lbs based on preference

## ✅ All Conversions Complete (Latest commit)

### Weight Display/Input Conversion — DONE

**Database Note:** All weights stored in kg (standard unit). Convert on display and user input only.

#### 1. ✅ ActiveWorkoutScreen (`src/screens/ActiveWorkoutScreen.js`)
- Line 291: "Last" display now uses `displayWeight(last.weight_kg)`
- Line 317: Weight input placeholder uses `displayWeight(last.weight_kg)`
- `completeSet()` (line 172): Converts user input with `parseWeight()` before saving
- `handleFinish()` (line 205): Auto-complete sets also use `parseWeight()`

#### 2. ✅ ProfileScreen Biometrics (`src/components/biometrics/UniversalFields.js`)
- Weight: displays in lbs if imperial, converts back to kg on input
- Height: displays as ft'in" if imperial (e.g., "5'10""), accepts formats: "5'10", "5'10\"", or decimal feet "5.83"
- All conversions happen in UniversalFields component
- Values stored in `form.weightKg` and `form.heightCm` remain in metric

#### 3. ✅ Progress Charts (`src/screens/ProgressScreen.js`)
- Line 273: Chart title shows `Weekly Volume (${weightUnit})`
- Volume data converted to lbs if imperial: `units === 'imperial' ? kgToLbs(w.total_volume) : w.total_volume`

#### 4. ✅ Exercise Detail (`src/screens/ExerciseDetailScreen.js`)
- Best Weight stat: uses `formatWeight(bestWeight)`
- Total Volume stat: uses `formatWeight(totalVolume, { decimals: 0 })`
- History table (lines 221, 225): Max weight and volume now use `formatWeight()`

#### 5. ✅ Personal Records (`src/screens/ProgressScreen.js` - Records tab)
- Line 385: PR weights now use `formatWeight(pr.best_weight)`

### Testing Checklist
- [ ] Toggle between metric/imperial in Settings
- [ ] Log a workout with weights in imperial → verify saves as kg
- [ ] View Progress charts in both units
- [ ] Check Exercise PRs display correctly
- [ ] Edit Profile biometrics in imperial → verify saves as kg/cm
- [ ] Test with fresh account (should auto-detect system locale)
- [ ] Test US locale defaults to imperial
- [ ] Test non-US locale defaults to metric

### Edge Cases to Handle
- Empty/zero values
- Decimal precision (1 decimal for lbs, 0 for kg typically)
- Height conversion edge cases (very tall/short people)
- Bodyweight exercises (no weight) should not show units

## Code Patterns

### Display weight (kg stored in DB):
```js
const { formatWeight, weightUnit } = useUnits();
<Text>{formatWeight(weightInKg)}</Text>
// or
<Text>{displayWeight(weightInKg)} {weightUnit}</Text>
```

### Parse user input (convert to kg for storage):
```js
const { parseWeight } = useUnits();
const weightInKg = parseWeight(userInput); // Returns kg regardless of unit preference
await db.saveSet({ weight_kg: weightInKg, ... });
```

### Height display/input:
```js
const { units, formatHeight, cmToFeet, feetToCm } = useUnits();
if (units === 'imperial') {
  // Show ft/in inputs or display
  const { feet, inches } = cmToFeet(heightCm);
} else {
  // Show cm
}
```

## Files Modified
- `App.js` - Added UnitsProvider wrapper
- `src/hooks/useUnits.js` - NEW: Units context and conversions
- `src/screens/SettingsScreen.js` - Added Units toggle
- `src/components/biometrics/UniversalFields.js` - Height/weight conversion logic
- `src/screens/ActiveWorkoutScreen.js` - Weight input/display + parseWeight on save
- `src/screens/ProgressScreen.js` - Weekly volume chart conversion
- `src/screens/ExerciseDetailScreen.js` - Stats display conversion

## Notes
- All internal storage remains in kg/cm (metric) - NEVER change this
- Conversion happens at display/input boundaries only
- User preference persists per account namespace
- System auto-detection runs once on first load if no preference saved
