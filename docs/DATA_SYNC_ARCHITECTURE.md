# GymMate - Data Sync Architecture

**Last Updated:** 2026-06-23
**Version:** 1.3.0

---

## Overview

GymMate uses a **local-first architecture** with optional cloud backup. All data lives in local storage (SQLite on native, localStorage on web) for fast access, with Firestore providing cloud backup, cross-device sync, and trainer↔client program/workout sharing.

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
| **Assigned Programs** | ❌ Not available | ✅ From trainer |

---

## Data Storage Locations

### Local Storage (All Users)

**SQLite Database (Native) / localStorage (Web):**
- Exercises (built-in + custom)
- Programs (user-created + trainer-assigned)
- Program days + exercises
- Workout sessions
- Session sets

**AsyncStorage:**
- `gymmate_biometrics` — profile data
- `gymmate_units` — metric/imperial preference
- `gymmate_last_sync` — last cloud sync timestamp (per-user namespace)
- `gymmate_theme` — dark/light/system preference
- `GEMINI_API_KEY` — user's Gemini key (never leaves device)

### Cloud Storage (Google Login Only)

**`users/{uid}`** — Blob backup: programs, exercises, biometrics, units preference.
Deliberately **excludes** workout sessions and sets (those live in `workout_sessions_cloud`).
- Max useful size: ~50–200 KB (programs + exercises only — static after initial seeding)
- Backup version: 2

**`workout_sessions_cloud/{sessionId}`** — One document per completed workout.
- Written on workout completion and on set edits from history
- Read by trainer for client progress view
- Read by `restoreSessionsFromCloud()` on sign-in to rebuild local session history
- No size ceiling concern — separate documents

**`trainer_clients/{relationshipId}`** — PT↔client relationships.
- Created by trainer (invite), updated by client (accept) or either (revoke)
- A client can have multiple accepted trainer relationships

**`program_templates/{templateId}`** — Invisible sync layer for PT-assigned programs.
- Keyed `tpl_{trainerId}_prog_{programId}` — one per local program per trainer
- Upserted silently when PT assigns a program or pushes updates
- Not surfaced in any UI — purely plumbing

**`program_assignments/{assignmentId}`** — Programs assigned to clients.
- Contains full `programData` snapshot (name, days, exercises)
- `assignmentType`: `linked` (overwritten on push) or `custom` (snapshot, never overwritten)
- Read by client's `syncAssignedPrograms()` on Programs screen load

**`workout_feedback_cloud/{feedbackId}`** — Trainer feedback on client workouts.

---

## Data Flow: When & What

### Sign-In

```
auth.signInWithGoogle()
  → syncOnSignIn(uid)
      Logic:
      - Cloud empty + local has data  → push blob
      - Local empty + cloud has data  → pull blob
      - Both have data + cloud unchanged since lastSync → push blob
      - Both have data + cloud changed → pull blob
  → restoreSessionsFromCloud(uid)
      - Queries workout_sessions_cloud where clientId == uid
      - Writes workout_sessions + session_sets into local SQLite
      - Idempotent (skips existing rows)
      - Resolves exercise IDs by name lookup (safe on fresh-install device)
```

### Workout Completion

```
ActiveWorkoutScreen.handleFinish()
  → db.completeSession(sessionId)               # local SQLite
  → workoutSync.uploadWorkoutSession(userId, session, sets)
      → setDoc(workout_sessions_cloud/{id})     # trainer-visible + restore source
  → cloudSync.backupToCloud(uid)                # debounced blob backup
```

### Workout History Edit (delete/edit set)

```
WorkoutDetailScreen.handleDeleteSet / handleSaveSet
  → db.deleteSet / db.updateSet                 # local SQLite
  → workoutSync.updateCloudSession(userId, session, sets)
      → setDoc on existing workout_sessions_cloud doc  # keeps trainer view in sync
```

### Program Assignment (PT flow)

```
ProgramDetailScreen → "Assign to Clients"
  → AssignProgramScreen (loads PT's own programs only)
  → On confirm:
      → programTemplates.upsertTemplateForProgram(trainerId, program)
          → setDoc(program_templates/tpl_{trainerId}_prog_{programId}, { merge: true })
      → programTemplates.assignToClient(templateId, clientId, trainerId, assignmentType)
          → setDoc(program_assignments/{id}, { programData: snapshot, assignmentType })
```

### Push Updates to Clients (PT flow)

```
ProgramDetailScreen → "Push Updates to Clients"
  → programTemplates.updateTemplateAndSync(templateId, trainerId)
      → upserts program_templates doc with fresh programData
      → queries program_assignments where templateId + trainerId
      → overwrites programData in each linked assignment doc
```

### Client Program Sync

```
ProgramsScreen.loadPrograms()
  → syncAssignedPrograms()
      → programTemplates.getClientAssignments(clientId)
          → reads all program_assignments where clientId == uid
      → For each assignment:
          - linked:  create or overwrite local program (stays current with trainer)
          - custom:  create only if not exists (independent copy, never overwritten)
      → Deletes local programs whose assignments no longer exist
```

### Trainer-Client Connection (multi-trainer)

```
ConnectTrainerScreen (no longer blocks if trainer already connected)
  → trainerClient.findInvite(code)
  → trainerClient.acceptInvite(relationshipId, clientId, clientName)
      → updateDoc(trainer_clients/{id})

ProfileScreen
  → trainerClient.getMyTrainers(clientId)  → array of all accepted connections
  → Per-trainer disconnect button → revokeConnection() + cascade-deletes assignments
```

---

## Backup Schedule

| Trigger | What happens |
|---|---|
| Sign-in | Pull or push blob + restore sessions from cloud |
| Workout finish | Upload to workout_sessions_cloud + debounced blob backup |
| Set edit in history | Update workout_sessions_cloud doc |
| Profile save | Blob backup |
| Units change | Blob backup |
| Program edit (blur) | Blob backup |
| Sign-out | Final blob backup |

---

## What the Blob Contains (BACKUP_VERSION 2)

**Included:** `exercises`, `programs`, `program_days`, `program_exercises`

**Excluded:**
- `workout_sessions` / `session_sets` — restored from `workout_sessions_cloud`
- Theme preference — device-specific
- Gemini API key — security, never leaves device
- Sync markers — device-specific

---

## Firestore Security Rules Summary

- `users/{uid}` — owner read/write only (isUserMatch)
- `trainer_clients` — trainer or client read/write; `isUserMatch` handles `google-` prefix
- `workout_sessions_cloud` — client write own; any authenticated read (trainer queries by clientId)
- `program_templates` — trainer read/write own (isUserMatch on trainerId)
- `program_assignments` — trainer create/delete; client read + update `lastSyncedAt` only

---

## Data Namespacing

All AsyncStorage and localStorage keys are namespaced per user via `activeUser.js`:

```
nsKey('gymmate_sessions') → 'gymmate_u_{userId}_sessions'
```

User ID formats:
- Google: `google-{firebase-uid}`
- Local: `local-{timestamp}`
- Demo: `demo-superwoman`

`setActiveUserId()` must be called before any database reads.

---

## Developer Checklist (new features)

- [ ] Decide: local-only or cloud-backed?
- [ ] If cloud: add Firestore security rule
- [ ] If in blob: add table to `BACKUP_TABLES` in `database.js`
- [ ] If user-editable: trigger `backupToCloud()` after save
- [ ] Timestamps: use `datetime('now', 'localtime')` — never bare `datetime('now')`
- [ ] Update this document

---

## Related Files

- `src/services/cloudSync.js` — blob backup/restore
- `src/services/workoutSync.js` — session cloud sync + `restoreSessionsFromCloud`
- `src/services/activeUser.js` — data namespacing
- `src/services/database.js` — local SQLite operations (schema v2)
- `src/services/database.web.js` — web localStorage operations
- `src/services/trainerClient.js` — PT↔client connections (multi-trainer)
- `src/services/programTemplates.js` — template/assignment Firestore ops
- `src/services/auth.js` — authentication
- `firestore.rules` — security rules
