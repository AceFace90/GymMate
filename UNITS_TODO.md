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

## 🚧 Remaining Work

### Critical: Weight Input/Output Conversion

**Database Note:** All weights stored in kg (standard unit). Convert on display and user input only.

#### 1. ActiveWorkoutScreen (`src/screens/ActiveWorkoutScreen.js`)
**Lines to update:**
- Line 291: `Last: {last.weight_kg}kg` → use `formatWeight(last.weight_kg)`
- Line 315-317: Weight TextInput - needs conversion:
  ```js
  // Display: convert kg to user's preferred unit
  value={set.weight ? displayWeight(parseFloat(set.weight)) : ''}
  // Placeholder: convert last set's kg to preferred unit
  placeholder={last?.weight_kg ? displayWeight(last.weight_kg) : '—'}
  ```
- `completeSet()` function: Convert user input back to kg before saving:
  ```js
  const weightInKg = parseWeight(parseFloat(set.weight));
  ```

#### 2. ProfileScreen Biometrics (`src/screens/ProfileScreen.js` + `src/components/biometrics/UniversalFields.js`)
**Current:** Labels show correct units but values are still stored/displayed as-is
**Needs:**
- Display conversion: Show weight in lbs if imperial, height in ft/in if imperial
- Input conversion: Convert user input back to kg/cm before saving to `form.weightKg`, `form.heightCm`
- Two approaches:
  - A) Convert in ProfileScreen before passing to UniversalFields
  - B) Add conversion logic inside UniversalFields component

**Height input for imperial:**
- Need separate feet and inches inputs when `units === 'imperial'`
- Combine to cm before saving: `feetToCm(feet, inches)`

#### 3. Progress Charts (`src/screens/ProgressScreen.js`)
- Line 273: `Weekly Volume (kg)` → use `Weekly Volume (${weightUnit})`
- Volume calculations: Convert kg to lbs for display if imperial
- All weight-related stats need conversion

#### 4. Exercise Detail PRs (`src/screens/ExerciseDetailScreen.js`)
- Line 181: `Best Weight`, value: `${bestWeight} kg` → use `formatWeight(bestWeight)`
- Line 183: `Total Volume`, value: `${totalVolume} kg` → use `formatWeight(totalVolume)`

#### 5. Program Detail Screen (if it shows weight targets)
Check if any weight recommendations are displayed

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

## Files Modified So Far
- `App.js` - Added UnitsProvider wrapper
- `src/hooks/useUnits.js` - NEW: Units context and conversions
- `src/screens/SettingsScreen.js` - Added Units toggle
- `src/components/biometrics/UniversalFields.js` - Updated labels
- `src/screens/ActiveWorkoutScreen.js` - Updated weight column header

## Notes
- All internal storage remains in kg/cm (metric) - NEVER change this
- Conversion happens at display/input boundaries only
- User preference persists per account namespace
- System auto-detection runs once on first load if no preference saved
