# Testing Workout Sync - Quick Guide

## Current Status

✅ Code deployed  
✅ Firestore rules deployed  
⏳ **Firestore indexes building** (takes 2-5 minutes)

## Check Index Status

**Before testing, verify the index is ready:**

https://console.firebase.google.com/project/gymmate-ef56f/firestore/indexes

Look for:
- Collection: `workout_sessions_cloud`
- Fields: `clientId`, `completedAt`
- Status: **"Enabled"** ✅ (not "Building" or "Creating")

⚠️ **If status is still "Building", wait a few minutes before testing.**

---

## Test Plan

### Test 1: Client Workout Upload

**As Client:**

1. Open http://localhost:8081 in browser #1
2. Sign in as **test client** (not your trainer account)
3. Go to Home → "Start Quick Workout"
4. Add 1-2 exercises
5. Log 2-3 sets with weight and reps
6. Tap "Finish Workout" → Save

**Expected Console Logs:**
```
[ActiveWorkout] Workout uploaded to cloud for trainer viewing
```

**Verify in Firestore Console:**
- Go to: https://console.firebase.google.com/project/gymmate-ef56f/firestore/data/workout_sessions_cloud
- Should see a new document with ID like `session_<userId>_<sessionId>_<timestamp>`
- Document should contain:
  - `clientId`: your test user ID
  - `completedAt`: timestamp
  - `sets`: array of set objects
  - `totalSets`, `completedSets`, `prCount`: numbers

✅ If document exists → Upload working!

---

### Test 2: Trainer View Client Progress

**As Trainer:**

1. Open http://localhost:8081 in browser #2 (or incognito)
2. Sign in as **trainer** (your main account)
3. Go to Clients tab
4. Tap on the test client you used above

**Expected to See:**
- **Progress section:**
  - Total Workouts: 1 (or more)
  - Total Sets: X
  - PRs: X
  - Last workout date
- **Recent Workouts section:**
  - Workout card with name, date, duration, sets

⚠️ **If you see "Failed to load workouts" error:**
- Check browser console
- If it says "index" → Index still building, wait 2 more minutes
- Refresh the page after waiting

✅ If you see workout card → Sync working!

---

### Test 3: Workout Detail View

**As Trainer (continuing from Test 2):**

1. Tap any workout card in Recent Workouts
2. Should navigate to detail screen

**Expected to See:**
- Workout name and date/time
- Duration, set count, PR count badges
- Exercise cards with:
  - Exercise name
  - Set-by-set table (Set #, Weight, Reps, RPE)
  - Trophy icons (🏆) on PR sets

✅ Full detail visible → Complete!

---

### Test 4: Auto-Complete & Prefill (New UX Features)

**As Client:**

1. Start a new Quick Workout
2. Add "Bench Press"
3. **Test auto-complete:**
   - Enter weight: "135"
   - Enter reps: "10"
   - Should automatically show green checkmark ✅
   - Rest timer should start
4. **Test prefill:**
   - Tap "Add Set"
   - New row should already show "135" and "10"
   - Just tap to edit or auto-completes again
5. **Test history stats:**
   - Should see badges: "Max: X lbs" "Best Vol: X lbs"

✅ All three features working!

---

## Troubleshooting

### Error: "The query requires an index"

**Cause:** Firestore index is still building  
**Fix:** Wait 2-5 minutes, then refresh page  
**Check:** https://console.firebase.google.com/project/gymmate-ef56f/firestore/indexes

---

### Error: "Failed to upload workout to cloud"

**Possible causes:**
1. User not signed in
2. Firebase auth issue
3. Network error

**Check browser console for:**
```
[ActiveWorkout] Failed to upload workout to cloud: <error message>
```

**Fix:**
- Make sure you're signed in with Google
- Check Network tab for failed requests
- Workout is still saved locally even if upload fails

---

### No workouts showing for trainer

**Checklist:**
1. ✅ Client completed a workout while signed in?
2. ✅ Trainer is viewing the correct client?
3. ✅ Client and trainer have active connection?
4. ✅ Firestore index is "Enabled" (not "Building")?
5. ✅ Check Firestore Console - are there documents in `workout_sessions_cloud`?

**Debug:**
- Open trainer view → Browser console
- Look for: `[ClientDetailScreen] Workouts for client: [...]`
- If empty array `[]` → No workouts uploaded yet
- If error → Check error message

---

### Workouts showing but detail view is empty

**Check:**
- Open Firestore Console
- View the workout document
- Verify `sets` array has data
- Verify `sets[].exerciseName`, `sets[].weightKg`, `sets[].reps` are populated

---

## Quick Demo Script

**2-Minute Full Flow:**

1. **Client window:** Sign in → Quick Workout → Add Bench Press
2. **Client window:** Enter 135 × 10 (auto-completes ✓)
3. **Client window:** Add Set (prefills to 135 × 10 ✓)
4. **Client window:** Finish Workout → Check console log ✓
5. **Trainer window:** Sign in → Clients → Tap client name
6. **Trainer window:** See stats (1 workout, X sets) ✓
7. **Trainer window:** Tap workout card
8. **Trainer window:** See full exercise breakdown ✓

**Result:** Full PT-client workout sync working end-to-end!

---

## What's Next After Testing

Once testing passes:

1. ✅ Test on mobile (iOS/Android) via Expo Go
2. ✅ Update version to v1.2.0
3. ✅ Commit changes
4. ✅ Deploy to GitHub Pages
5. 📱 Share with beta testers

---

## Need Help?

**Console not showing logs?**
- Open DevTools (F12)
- Go to Console tab
- Filter by "ActiveWorkout" or "ClientDetail"

**Index taking too long?**
- Usually 2-5 minutes
- Worst case: 10-15 minutes
- Check status link above

**Something else broken?**
- Check git status: `git status`
- Check if dev server crashed
- Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
