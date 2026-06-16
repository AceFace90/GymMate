# GymMate - Data Sync Architecture

**Last Updated:** 2026-06-16  
**Version:** 1.2.0

---

## Overview

GymMate uses a **local-first architecture** with optional cloud backup. All data lives in local storage (SQLite on native, localStorage on web) for fast access, with Firestore providing cloud backup and sync for signed-in users.

---

## Feature Matrix: Google Login vs Local-Only

| Feature | Local-Only Account | Google Account |
|---------|-------------------|----------------|
| **Workouts** | ✅ Full access | ✅ Full access |
| **Exercise Library** | ✅ Full access | ✅ Full access |
| **Programs** | ✅ Full access | ✅ Full access |
| **Progress Tracking** | ✅ Full access | ✅ Full access |
| **Personal Records** | ✅ Full access | ✅ Full access |
| **Profile/Biometrics** | ✅ Local only | ✅ Cloud synced |
| **Units Preference** | ✅ Local only | ✅ Cloud synced |
| **Cross-Device Sync** | ❌ No sync | ✅ Full sync |
| **Data Backup** | ❌ Device only | ✅ Cloud backup |
| **Trainer Features** | ❌ Not available | ✅ Full access |
| **Client Features** | ❌ Not available | ✅ Full access |
| **Workout Sharing** | ❌ Not available | ✅ With trainer |
| **Program Templates** | ❌ Not available | ✅ From trainer |

### Key Differences

**Local-Only Account:**
- All data stored on device only
- No backup or recovery if device is lost
- Cannot connect with trainers
- Cannot share workouts
- Faster (no network calls)
- Works offline always

**Google Account:**
- Data backed up to Firestore
- Sync across multiple devices
- Connect with trainers (PT features)
- Share workouts with trainer
- Receive program templates
- Requires internet for sync

---

## Data Storage Locations

### Local Storage (All Users)

**SQLite Database (Native) / localStorage (Web):**
- Exercises (built-in + custom)
- Programs (user-created)
- Program days
- Program exercises
- Workout sessions
- Session sets
- Counters (for ID generation)

**AsyncStorage:**
- `gymmate_biometrics` - Profile data (name, age, sex, height, weight, body fat %, activity level, primary goal, pregnancy/cycle data)
- `gymmate_units` - Metric/Imperial preference
- `gymmate_last_sync` - Timestamp of last cloud sync (per user namespace)
- `gymmate_theme` - Dark/light/system theme preference
- `GEMINI_API_KEY` - User's Gemini AI key (if configured)

### Cloud Storage (Google Login Only)

**Firestore Collection: `users/{uid}`**
- Full backup of local database (exercises, programs, sessions, sets)
- AsyncStorage data (biometrics, units preference)
- `updatedAt` timestamp for sync reconciliation

**Firestore Collection: `trainer_clients/{relationshipId}`**
- Trainer-client relationships
- Connection status
- Trainer name, email
- Client name, email

**Firestore Collection: `program_templates/{templateId}`**
- Trainer-created program templates
- Template days and exercises
- Assigned to specific trainer

**Firestore Collection: `program_assignments/{assignmentId}`**
- Programs assigned by trainer to client
- Assignment status
- Program data

**Firestore Collection: `workout_sessions_cloud/{sessionId}`**
- Client workout sessions (synced after completion)
- Exercise sets with weight/reps
- Workout duration, notes
- Visible to trainer

**Firestore Collection: `workout_feedback_cloud/{feedbackId}`**
- Trainer feedback on client workouts
- Visible to client

---

## Data Flow: When & What

### 1. App Initialization

**On App Launch:**
```
1. Load current user from AsyncStorage
2. Set active user ID (for data namespacing)
3. Initialize local database
4. Seed built-in exercises (if not present)
5. If Google user: syncOnSignIn()
```

**syncOnSignIn() Logic:**
- **Cloud empty, local has data** → Push local to cloud
- **Cloud has data, local empty** → Pull cloud to local
- **Both have data:**
  - If cloud unchanged since last sync → Push local (has newer edits)
  - If cloud changed elsewhere → Pull cloud (trust remote)
  - If no sync marker → Pull cloud (safe default)

### 2. Profile Save

**When: User clicks "Save Profile" button**

**Flow:**
```
ProfileScreen.handleSave()
  ↓
1. Save to AsyncStorage (nsKey('gymmate_biometrics'))
2. If Google user: backupToCloud(uid)
   ↓
   - Export all local data (database + AsyncStorage)
   - Write to Firestore: users/{uid}
   - Update last sync timestamp
```

**Data Backed Up:**
- Profile: name, age, sex, height, weight, body fat %, activity level, primary goal
- Pregnancy: isPregnant, trimester
- Cycle: last period date, cycle length
- All workout data (sessions, sets, exercises, programs)

### 3. Units Preference Change

**When: User toggles Metric/Imperial in Settings**

**Flow:**
```
SettingsScreen → setUnits()
  ↓
useUnits.setUnitsPreference()
  ↓
1. Update state
2. Save to AsyncStorage (nsKey('gymmate_units'))
3. If Google user: backupToCloud(uid)
```

### 4. Workout Completion

**When: User clicks "Finish Workout" in ActiveWorkoutScreen**

**Flow:**
```
ActiveWorkoutScreen.handleFinish()
  ↓
1. Save locally: db.completeSession(sessionId)
2. If Google user: workoutSync.uploadWorkoutSession()
   ↓
   Write to Firestore: workout_sessions_cloud/{sessionId}
   - Includes: exercises, sets, weight, reps, duration, notes
   - Visible to trainer (if connected)
```

**Local Storage:**
- Session marked complete (completed_at timestamp)
- All sets persist with completed flag

**Cloud Storage (Google only):**
- Copy of session + sets → `workout_sessions_cloud`
- Trainer can query by clientId
- Does NOT trigger full backup (separate collection)

### 5. Logout

**When: User clicks "Log Out" in ProfileScreen**

**Flow:**
```
ProfileScreen.confirmLogout()
  ↓
auth.signOutGoogle()
  ↓
1. If Google user: backupToCloud(uid) - final backup
2. Sign out from Firebase Auth
3. Clear current user from AsyncStorage
4. Clear active user ID (namespace)
5. Return to login screen
```

**Important:** Local data is NOT deleted on logout. It remains in the user-namespaced storage keys for next sign-in.

### 6. Login

**When: User signs in with Google**

**Flow:**
```
LoginScreen → auth.signInWithGoogle()
  ↓
1. Authenticate with Firebase
2. Get user data (uid, email, name, photo)
3. Set active user ID (namespace all data reads)
4. syncOnSignIn(uid) - reconcile local vs cloud
5. Initialize database (seed exercises if needed)
6. Save current user to AsyncStorage
7. Navigate to app
```

### 7. Trainer-Client Connection

**When: Client enters trainer code**

**Flow:**
```
ConnectTrainerScreen → trainerClient.createConnection()
  ↓
1. Look up trainer by code
2. Create relationship: trainer_clients/{relationshipId}
3. Store: trainerId, clientId, status, names, emails
```

**When: Trainer views client workouts**

**Flow:**
```
ClientDetailScreen.load()
  ↓
1. Query: workout_sessions_cloud where clientId = {clientId}
2. Display workout history, stats, PRs
```

---

## Data Backup Schedule

### Automatic Backups (Google Login Only)

1. **On Sign-In** - `syncOnSignIn()` reconciles local vs cloud
2. **On Profile Save** - Immediate backup after saving biometrics
3. **On Units Change** - Immediate backup after toggling metric/imperial
4. **On Sign-Out** - Final backup before logout
5. **On Workout Complete** - Session uploaded to `workout_sessions_cloud` (separate from full backup)

### What Gets Backed Up

**Full Backup (users/{uid}):**
- All exercises (built-in + custom)
- All programs (user-created)
- All workout sessions
- All session sets
- Profile/biometrics data
- Units preference

**Separate Collections (not in backup):**
- Trainer-client relationships (`trainer_clients`)
- Program templates (`program_templates`)
- Program assignments (`program_assignments`)
- Workout sessions cloud (`workout_sessions_cloud`) - separate for trainer visibility
- Workout feedback (`workout_feedback_cloud`)

### What Does NOT Get Backed Up

- Theme preference (device-specific)
- Gemini API key (security - never leaves device)
- Sync markers (device-specific)
- Local-only accounts (no Google sign-in)

---

## Data Namespacing

**Problem:** Multiple users (including demo) used to share one localStorage dataset.

**Solution:** Per-user namespacing via `activeUser.js`

**How It Works:**
```javascript
// Base key: 'gymmate_sessions'
// Namespaced: 'gymmate_u_google-abc123_sessions'

nsKey('gymmate_sessions')
  → 'gymmate_u_{userId}_sessions'

// Before login (no active user): uses base key
// After login: uses namespaced key
```

**User IDs:**
- Google users: `google-{uid}` (e.g., `google-abc123xyz`)
- Local users: `local-{timestamp}` (e.g., `local-1234567890`)
- Demo user: `demo-superwoman`

**Critical:** `setActiveUserId()` must be called BEFORE any database operations.

---

## Firestore Security Rules

**users/{uid}:**
```
allow read, write: if request.auth.uid == uid;
```
- Users can only read/write their own backup document

**trainer_clients/{relationshipId}:**
```
allow read, write: if isTrainer() || isClient();
```
- Trainer and client can both read/write the relationship

**workout_sessions_cloud/{sessionId}:**
```
allow read, write: if isClientOrTrainer();
```
- Client can write their own workouts
- Trainer can read client workouts

**program_templates/{templateId}:**
```
allow read, write: if isTrainer();
```
- Only trainers can create/edit templates

**program_assignments/{assignmentId}:**
```
allow read: if isClientOrTrainer();
allow write: if isTrainer();
```
- Trainer assigns programs
- Client can read assigned programs

---

## Troubleshooting

### Profile Data Not Syncing

**Symptom:** Weight/height missing on new device  
**Cause:** Profile save didn't trigger cloud backup  
**Solution:** Ensure `backupToCloud()` is called in `ProfileScreen.handleSave()`

### Records Disappearing After Logout

**Symptom:** Personal records missing after re-login  
**Cause:** `activeUserId` not cleared on logout, stale namespace  
**Solution:** Call `setActiveUserId(null)` in logout handler

### Workouts Not Visible to Trainer

**Symptom:** Trainer sees 0 workouts for client  
**Cause:** Workout not uploaded to `workout_sessions_cloud`  
**Solution:** Ensure `workoutSync.uploadWorkoutSession()` called after `completeSession()`

### Data From Other User Appearing

**Symptom:** Seeing workouts/programs from different user  
**Cause:** `setActiveUserId()` not called early enough  
**Solution:** Call `setActiveUserId()` BEFORE any database reads (App.js init, login)

---

## Developer Checklist

When adding new features that store data:

- [ ] Decide: Local-only or cloud-backed?
- [ ] If local: Use `nsKey()` for storage keys
- [ ] If cloud: Add to Firestore with proper security rules
- [ ] If should sync: Add to `exportAllData()` / `importAllData()`
- [ ] If user-editable: Trigger `backupToCloud()` after save
- [ ] Update this document with data flow
- [ ] Update feature matrix if Google-only feature

---

## Related Files

- `src/services/cloudSync.js` - Backup/restore logic
- `src/services/activeUser.js` - Data namespacing
- `src/services/database.js` - Local SQLite operations
- `src/services/database.web.js` - Web localStorage operations
- `src/services/workoutSync.js` - Workout cloud sync for trainers
- `src/services/auth.js` - Authentication & user management
- `firestore.rules` - Firestore security rules

---

**This document should be updated whenever:**
- New data storage is added
- Sync behavior changes
- New Google-only features are added
- Backup schedule changes
- Data flow changes
