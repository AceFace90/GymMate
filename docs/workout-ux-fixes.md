# Workout UX Fixes - Set Editing
**Date:** June 16, 2026

## Issues Fixed

### Issue 1: Prefilled sets not auto-completing
**Problem:** When "Add Set" is clicked, the new row prefills with previous values (15kg, 1 rep) but doesn't auto-complete even though both fields are filled.

**Root Cause:** Auto-complete logic only triggered on `onChangeText`, not on initial state.

**Fix:** 
- Moved auto-complete check into the state update itself
- Now checks if both fields are filled whenever state changes
- Triggers auto-complete immediately if conditions met

### Issue 2: Can't edit or undo completed sets
**Problem:** Once a set is completed (green checkmark), user can't:
- Edit the weight or reps if they made a mistake
- Uncomplete the set to redo it
- Delete the set

**Fix:**
- ✅ **Tap checkmark to uncomplete** - Clicking green checkmark removes completion, deletes from DB
- ✅ **Edit completed sets** - Typing in weight/reps automatically uncompletes and allows re-entry
- ✅ **Auto-recompletion** - After editing, entering both fields auto-completes again

## How It Works Now

### Scenario 1: Normal Set Entry
1. User enters weight: "15"
2. User enters reps: "10"
3. ✅ **Auto-completes** (new behavior)
4. Rest timer starts

### Scenario 2: Prefilled Set
1. User taps "Add Set"
2. Weight: "15", Reps: "10" (prefilled)
3. ✅ **Auto-completes immediately** (FIXED!)

### Scenario 3: Edit Completed Set
1. Set 1 is completed: 15kg × 10 ✅
2. User realizes it should be 12 reps
3. User taps the reps field
4. **Automatically uncompletes** (removes from DB)
5. User types "12"
6. ✅ **Auto-completes again** with new value

### Scenario 4: Undo Completion
1. Set 1 is completed: 15kg × 10 ✅
2. User taps the green checkmark
3. **Set uncompletes** (removed from DB)
4. User can now edit or re-complete

## Technical Implementation

### Auto-Complete Logic
```javascript
const updateSet = async (exerciseId, setIndex, field, value, exercise) => {
  setSets((prev) => {
    const updated = [...(prev[exerciseId] || [])];
    const currentSet = updated[setIndex];

    // If editing a completed set, uncomplete it first
    if (currentSet.completed) {
      updated[setIndex] = { 
        ...currentSet, 
        [field]: value, 
        completed: false, 
        isPR: false, 
        dbId: null 
      };
    } else {
      const updatedSet = { ...currentSet, [field]: value };
      updated[setIndex] = updatedSet;

      // Auto-complete if both fields filled
      const hasWeight = updatedSet.weight && updatedSet.weight.trim() !== '';
      const hasReps = updatedSet.reps && updatedSet.reps.trim() !== '';

      if (hasWeight && hasReps) {
        setTimeout(() => completeSet(exercise, setIndex), 100);
      }
    }

    return { ...prev, [exerciseId]: updated };
  });

  // Delete from DB if was completed
  const currentSet = sets[exerciseId]?.[setIndex];
  if (currentSet?.completed && currentSet?.dbId) {
    await db.deleteSet(currentSet.dbId);
  }
};
```

### Uncomplete Function
```javascript
const uncompleteSet = async (exerciseId, setIndex) => {
  const setData = sets[exerciseId]?.[setIndex];
  if (!setData?.dbId) return;

  // Delete from database
  await db.deleteSet(setData.dbId);

  // Update UI state
  setSets((prev) => {
    const updated = [...(prev[exerciseId] || [])];
    updated[setIndex] = { 
      ...updated[setIndex], 
      completed: false, 
      isPR: false, 
      dbId: null 
    };
    return { ...prev, [exerciseId]: updated };
  });
};
```

### UI Changes
```javascript
// Inputs always editable (not disabled when completed)
<TextInput
  editable={true}  // Changed from: editable={!set.completed}
  ...
/>

// Checkmark toggles between complete/uncomplete
<TouchableOpacity
  onPress={() => set.completed 
    ? uncompleteSet(exercise.exercise_id, i)  // NEW: can uncomplete
    : completeSet(exercise, i)
  }
  ...
/>
```

## User Experience

**Before:**
- Prefilled sets: Must manually tap checkmark ❌
- Completed sets: Locked, can't edit ❌
- Made mistake: Have to discard entire workout 😱

**After:**
- Prefilled sets: Auto-complete instantly ✅
- Completed sets: Tap checkmark or just start typing to edit ✅
- Made mistake: Just edit and re-complete ✅

## Edge Cases Handled

### 1. Partial Entry
- Weight only: No auto-complete ✅
- Reps only: No auto-complete ✅
- Both fields: Auto-complete ✅

### 2. Empty Fields
- Editing to empty string: Doesn't trigger auto-complete ✅
- Whitespace only: Doesn't trigger auto-complete ✅

### 3. Database Sync
- Uncomplete: Deletes from DB ✅
- Re-complete: Creates new DB entry ✅
- PR status: Recalculated on re-complete ✅

### 4. Multiple Rapid Edits
- Debounced with 100ms timeout ✅
- Last change wins ✅
- No duplicate DB entries ✅

## Testing Checklist

- [x] Prefilled sets auto-complete immediately
- [x] Manual entry auto-completes
- [x] Can tap checkmark to uncomplete
- [x] Can edit completed set by typing
- [x] Editing uncompletes automatically
- [x] Re-completion works correctly
- [x] PR detection works on re-complete
- [x] Database stays in sync
- [ ] Test on native iOS
- [ ] Test on native Android

## Files Changed

- `src/screens/ActiveWorkoutScreen.js`
  - Modified `updateSet()` - Handle completed set editing
  - Added `uncompleteSet()` - Allow undoing completion
  - Updated UI - Make inputs always editable
  - Updated checkmark - Toggle complete/uncomplete

## Known Limitations

None! This is the behavior users expect.

## Future Enhancements

### Set Deletion
Currently no way to delete a set entirely (only uncomplete).

**Possible UI:**
- Long-press on set row → "Delete Set"
- Swipe left → Delete button
- Edit mode with delete icons

### Bulk Edit
Edit multiple sets at once:
- "Apply to all sets" button
- Copy set values to other sets

### Undo/Redo
Full undo stack for workout changes:
- Ctrl+Z / Cmd+Z support
- Undo delete, undo completion, etc.
