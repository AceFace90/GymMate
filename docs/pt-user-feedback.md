# PT User Feedback Log

Running log of feedback and feature requests from PT (personal trainer) testers.
Newest batch at top.

---

## Batch 1 — 2026-06-18 (first PT tester)

### 1. Settings gear not appearing on Android — BUG (needs validation)
- **Report:** Tester cannot access the Settings page (where the Gemini API key is entered). The green settings wheel does not appear on his Profile screen.
- **Environment:** Android. Works fine on owner's device (iOS).
- **Hypotheses to validate:** stale install (try reinstall / clear cache first); Android-specific rendering of the `headerRight` gear icon in `ProfileStackNav`; or icon-font load failure on Android.
- **Status:** Open — confirm whether reinstall fixes it before code changes.

### 2. Trainers add own exercises + custom video URLs — FEATURE REQUEST
- **Report:** Some PTs want to add their own exercises to the library, and set/change the video URL per exercise (they record their own training videos).
- **Need:** ability to attach a Vimeo OR YouTube URL to an exercise (custom or built-in).
- **Notes:** `createCustomExercise` already exists; `exercise-videos.js` maps exercise→video. Schema has/needs a `video_url` field (ARCHITECTURE.md "Video Library Links" was schema-only). Likely: editable video_url on exercise + surface in ExerciseDetail.
- **Status:** Open — design needed.

### 3. Templates feature broken / incomplete — BUG + FEATURE
Multiple issues with trainer Templates:
- **3a.** Cannot create a template with AI the way you can for a personal program (AI option missing). — FEATURE/PARITY
- **3b.** Templates screen hangs ~20s on "Loading templates" before finally loading a newly created template. — BUG (perf)
- **3c.** The Edit button on a template does not work. — BUG
- **Status:** Open.

### 4. Records not showing despite captured PRs — BUG (fix written, NOT yet deployed)
- **Report:** WorkoutDetail shows 20 sets with PR trophies and "20 PRs", but the Records tab shows "No records yet".
- **Root cause:** exercise-ID drift — sets reference old exercise ids that no longer match the re-seeded exercises table, so the records join returns nothing.
- **Fix:** commit `79f3e43` (seed exercises by name to keep ids stable + `repairOrphanedSets` re-links orphaned sets via exercise_name). **Committed locally, not pushed** — tester is on the live site which still has the bug. Pushing + redeploy should heal his data on next load.
- **Sub-item to investigate:** every set shows a PR trophy ("20 PRs") — PR detection in `logSet` may be over-flagging. Verify separately.
- **Status:** Records fix deployed. PR over-flagging confirmed + FIXED (see item 5).

### 5. PR over-flagging — every set marked a PR — BUG (FIXED)
- **Report:** WorkoutDetail showed a trophy on every set ("20 PRs" for ~20 sets).
- **Root cause:** `logSet` computed `isPR` per-set against best-from-prior-sessions only; first-time exercise → prevBest=0 → every set with weight>0 was a PR.
- **Fix:** PR computation moved to `completeSession` via `markSessionPRs` — at most one PR per exercise per session (heaviest set, only if it beats all-time prior best). `logSet` now stores `is_pr=0`.
- **Note:** native `database.js` has the same bug (task #12), but tester is on web.
- **Status:** Fixed (web).

### 6. Programs not saving / changes need reinstall — BUG (sync, in progress)
- **Report:** Programs the user creates don't save correctly; on iPhone, changes aren't applied unless the app is deleted and re-saved to home screen from the website.
- **Root cause (verified):** program create/update/delete never call `auth.backupCurrentUser()`, so programs persist to localStorage but never push to Firestore. A new device / PWA reinstall pulls stale cloud state without them.
- **Contributing factor:** iOS PWA installed-context localStorage is isolated from the browser's, so edits in one aren't seen in the other.
- **Fix:** back up after program mutations. See task #11.
- **Status:** In progress.
