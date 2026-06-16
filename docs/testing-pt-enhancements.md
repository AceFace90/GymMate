# Testing PT-Client Enhancements

Test these 5 new features with two browser windows/profiles.

## Setup (5 min)

### Window 1 - Trainer Account
1. Open `http://localhost:19006` in Chrome
2. Create/login as trainer user (toggle "I'm a Personal Trainer")
3. Go to Templates tab

### Window 2 - Client Account  
1. Open `http://localhost:19006` in Chrome Incognito (or another browser)
2. Create/login as client user (athlete role)
3. Stay on Programs screen

## Test 1: Full Program Sync ✅
**Goal:** Client receives complete program with all exercises

**Trainer side:**
1. Create a new template (or use existing)
2. Add 2-3 days with 3-4 exercises each
3. Go to Connections tab
4. Click client → "Assign Program"
5. Select the template and assign

**Client side:**
1. Refresh/reload the page
2. ✅ Should see green notification banner "1 new program assigned..."
3. ✅ Program should appear with 🔒 prefix
4. Click into the program
5. ✅ Should see all days and exercises that trainer created

## Test 2: Read-Only Controls ✅
**Goal:** Client can't edit assigned programs

**Client side:**
1. Open the assigned program (🔒 prefix)
2. ✅ Should see blue banner: "Assigned by [Trainer Name] • Read-only"
3. ✅ No "Add Training Day" button at bottom
4. ✅ No "Add Exercise" buttons on days
5. ✅ No trash icons to delete days
6. ✅ No up/down arrows to reorder exercises
7. ✅ No X buttons to remove exercises
8. Can still click "Start Workout" (workouts should work normally)

## Test 3: Trainer Name Display ✅
**Goal:** See actual trainer name, not generic message

**Client side:**
1. Open assigned program
2. ✅ Banner should say "Assigned by [Actual Trainer Name]" not "Assigned by your trainer"

## Test 4: Program Update Sync ✅
**Goal:** Trainer updates propagate to client

**Trainer side:**
1. Open the template you assigned
2. Edit it: add a new day, add/remove exercises, change sets/reps
3. Go back to Templates screen
4. Click "Sync" button on that template
5. ✅ Should see "Synced changes to 1 assigned client"

**Client side:**
1. Refresh/reload the page
2. Open the assigned program
3. ✅ Should see all the changes trainer made (new days, exercises, etc.)

## Test 5: Progress Tracking ✅
**Goal:** Trainer sees when client synced

**Client side:**
1. Refresh page (this triggers sync and updates timestamp)

**Trainer side:**
1. Go to Connections → click the client
2. Look at the assigned program card
3. ✅ Should see "Last synced [today's date]" under the assignment

## Test 6: Notification Dismissal ✅
**Goal:** Client can dismiss notification

**Client side:**
1. If green notification banner is showing
2. Click the X button on the right
3. ✅ Banner should disappear

## Test 7: Unassign Cleanup ✅
**Goal:** Program disappears when trainer unassigns

**Trainer side:**
1. Go to Connections → click client
2. Click X on the assigned program
3. Confirm removal

**Client side:**
1. Refresh page
2. ✅ Assigned program should be gone from list

## Expected Issues (known limitations)
- Last sync timestamp only updates when client opens Programs screen, not when they complete workouts
- No real-time updates (client must refresh to see changes)
- Workout history not synced to trainer yet (future feature)

## Quick Test Script (2 min)
If you just want to verify everything works:

```bash
# Terminal 1 - keep this running
npm run web

# Terminal 2 - open two browsers
# Chrome: http://localhost:19006 (trainer)
# Incognito: http://localhost:19006 (client)

# Trainer: Create template → assign to client
# Client: Refresh → see program with exercises → verify read-only
# Trainer: Click "Sync" button
# Client: Refresh → verify changes appeared
```

## Troubleshooting

**Program shows but no days:**
- Check browser console for errors
- Verify template has days before assigning
- Try creating a new template with AI generation

**Can't see trainer name:**
- Make sure trainer account has a name set
- Check that created_by_user_id is set on program

**Sync button doesn't work:**
- Check browser console for Firestore errors
- Verify template still has programId field

**No notification banner:**
- Banner only shows for NEW assignments (not existing ones on refresh)
- Try assigning a different program to trigger it
