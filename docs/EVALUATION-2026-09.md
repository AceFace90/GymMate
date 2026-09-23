# GymMate — Evaluation: Bugs, Tech Debt & Roadmap

**Date:** 2026-09-23
**Reviewed:** commit `7838f94` (main) · Expo SDK 51 / RN 0.74 / Firebase 12 · web-first PWA on GitHub Pages
**Method:** direct read of architecture/sync docs, CI, Firestore rules + three parallel code audits (data/sync, tech-debt, native-readiness); the two highest-impact bugs re-verified by hand.

## Executive summary

Well-structured feature-first app (clean `screens / components / services / hooks / theme` split, single `db` facade, thoughtful local-first + Firestore-backup design, unusually good docs). Real and in use by PT testers. Health picture: **"good bones, fragile edges."** Three issues dominate:

1. **Firestore privacy hole** — any signed-in user can read every user's workout history.
2. **Two hand-maintained DB implementations** (`database.js` native / `database.web.js` web) drifted in both directions; they also produce **incompatible cloud backups**. Biggest blocker to native.
3. **No automated tests / lint / CI gate** — all hand-rolled SQL, analytics, PR logic and sync round-trips are unverified.

### Severity scorecard

| Area | Grade | Note |
|---|---|---|
| Product/UX design | A– | Coherent, well-scoped, real users |
| Architecture (intent) | B+ | Local-first + role model is sound |
| Architecture (execution) | C | Dual-DB drift, service→screen import, giant screens |
| Data integrity / sync | C– | Several confirmed round-trip bugs |
| Security | D | World-readable sessions; over-permissive invite rule |
| Test/CI maturity | F | No tests, no lint, no type-check, fragile `sed`-based deploy |
| Native readiness | D | Structured for it, but untested and blocked |

## P0 — Security & data integrity (fix now)

| # | Finding | Location | Impact |
|---|---|---|---|
| 1 | **`workout_sessions_cloud` world-readable.** A restrictive `allow read` is followed by `allow read: if isSignedIn();`; Firestore OR-combines → any authed user reads everyone's data. | `firestore.rules:104-117` | Privacy breach. **Needs a small data-model change** (stamp authorized viewer UIDs on the session doc) because the relationship doc ID `${trainerId}_${inviteCode}` isn't derivable from `(trainerId, clientId)`, so a rules-only fix would break trainer read. |
| 2 | **`completed` uploads as `false`.** Web stores boolean `true`; upload did `s.completed === 1` → `false`. | `database.web.js:446`, `workoutSync.js:64,226` | Trainers see client sets as incomplete. **FIXED** → `!!s.completed`. |
| 3 | **Over-permissive invite-accept rule** — any authed user could rewrite any field of a pending invite. | `firestore.rules:43-47` | Invite hijacking. **FIXED** → accepter must claim as self, can't rewrite trainerId. |

## P1 — Correctness bugs affecting users today

| # | Finding | Location |
|---|---|---|
| 4 | `restoreSessionsFromCloud` throws on web every sign-in (calls native-only `restoreSession`/`getExerciseByName`/`restoreSet`); error swallowed by `auth.js`. | `workoutSync.js:252-298` |
| 5 | Assigned-program sync writes blank day names — `addProgramDay(programId, dayNumber, name)` vs signature `(programId, {name, dayNumber, sortOrder})`. | `programTemplates.js:287` |
| 6 | Client program sync denied by rules — client `updateDoc({localProgramId})` but rules allow only `lastSyncedAt`. | `programTemplates.js:307-310` vs `firestore.rules:80-84` |
| 7 | Duplicate cloud sessions — upload keys docs with `...${Date.now()}`. | `workoutSync.js:12` |
| 8 | PR over-flagging still live on native (`logSet` flags per-set; no `markSessionPRs`). | `database.js:420-438` |
| 9 | Timestamp format drift across native/web/restore (localtime vs UTC ISO vs `T`/`Z`). | `database.js`, `database.web.js:112`, `workoutSync.js:23-29,267` |

## P2 — Tech debt

- **Dual DB divergence (critical):** ~40 functions reimplemented twice, out of sync (`restoreSession`/`restoreSet`/`getExerciseByName` native-only; `markSessionPRs`/`resetPRsForExercise` web-only; `updateProgram` `isTemplate` web-only; auto-backup real on web, no-op native). `resetPRsForExercise` called at `ProgressScreen.js:130` crashes on native.
- **Incompatible backup blobs:** web = v1 camelCase incl. sessions; native = v2 snake_case excl. sessions; same `users/{uid}` doc → cross-platform restore drops data. **Reconcile before native.**
- **No tests / lint / type-check;** CI only deploys.
- **Fragile deploy:** `deploy.yml` rewrites bundle paths + injects `@font-face` via `sed`/`find`.
- **Layering violation:** services import `getGeminiKey` from `screens/SettingsScreen`.
- **Gemini key hygiene:** plaintext storage + `?key=` URL param.
- **Oversized components:** `ActiveWorkoutScreen` (726 lines), `ProgramDetailScreen` (555); `setTimeout` inside a `setState` updater is race-prone (`ActiveWorkoutScreen:182-213`).
- **105 `console.log/error`** left in, no prod gating.
- **Version drift:** package.json 1.2.0 vs app.json 1.0.0 vs docs 1.3.0.
- **Native FK crash:** `deleteProgram` hits FK constraint if program has logged sessions.

## Missing / incomplete features

| Feature | Status | Source |
|---|---|---|
| Custom exercises + editable video URL | Not started; `video_url` schema-only | pt-user-feedback #2 |
| AI natural-language workout logging | Not started | backlog #7 |
| Supersets | Needs schema/UX | backlog #6 |
| Template day/exercise push sync | `// TODO` stub | `programTemplates.js:266` |
| Native date picker | Placeholder alert | `DatePicker.js:62` |
| PT feature unlock / monetization | Spec'd, not built | future-pt-feature-unlock.md |
| Native video playback | Web iframe only; needs `react-native-webview` | VIDEO_INTEGRATION.md |

## Roadmap (priority order)

1. **Phase 0 (days):** P0 security/data hotfix — only genuinely urgent item (data exposed now).
2. **Phase 1 (1–2 wks):** P1 sync bugs — they corrupt the trainer↔client differentiator.
3. **Phase 2 (2–3 wks):** reconcile the two DBs + blob format, add test/lint/CI — **prerequisite gate for native.**
4. **Phase 3:** ship PT-requested features (custom exercises + video URLs first).
5. **Phase 4:** native iOS (see IOS-NATIVE-PLAN.md).
6. **Phase 5:** monetization (PT unlock code → Stripe/RevenueCat).
