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
- **Status:** Fix pending deploy; PR-over-flagging needs investigation.
