# GymMate iOS (SwiftUI) — Session Handoff

**Date:** 2026-11-09
**Project:** `/Users/wcorrey/Claude/personal/GymMate/GymMate App/` (Xcode project `GymMate App.xcodeproj`, JSON-style `project.xcproj`, synced folder `GymMate App/`, so new files auto-compile)
**Git:** nothing from the iOS work is committed (`GymMate App/` and `.codex/` are untracked). Use SSH remote `git@github-personal:`; show diff summary + message before committing.
**Build:** `export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer; xcodebuild -project "GymMate App.xcodeproj" -scheme "GymMate App" -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/gymmate-dd CODE_SIGNING_ALLOWED=NO build` — last build: succeeded, zero Swift warnings.

## Decisions
- Orange accent (#FF9500 / #FF9F0A dark); iOS system palette, 26pt cards; avoid Activity-Ring visuals and Fitness+ lime (App Review 5.2.5).
- Backend: Firebase, same project as web (`gymmate-ef56f`). Bundle ID `com.wallacecorreypersonalteam.GymMateApp`, team `FQ7MMD3P9X`, free Apple account.
- Google sign-in only (Sign in with Apple removed: free account). HealthKit paused (entitlement + usage strings wired, service unused).
- AI program creation uses Apple's on-device model (FoundationModels), not Gemini. Web keeps Gemini.
- Test account: wacorrey@gmail.com.

## Done and working (user confirmed: sign-in, load time)
- Today / Programs / Exercises (150 seed, search, custom) / Progress tabs, settings (theme, units kg/lb), PR logic matching web.
- Google sign-in (Settings > Account), `GoogleService-Info.plist` + `GymMate-Info.plist` (URL scheme) via `INFOPLIST_FILE`.
- Firestore sync (`Services/CloudSync.swift`, `WorkoutStore.syncDown`): upload on finish, delete mirrors, pull on sign-in incl. web sessions, push local-only. Doc id `session_<uid>_<sessionUUID>` in `workout_sessions_cloud`.
- Notes, RPE, duration on sessions; edit/delete past workouts with PR recompute (`WorkoutStore.updateSession`).
- AI program sheet (`Views/AIProgramSheet.swift`, `Services/ProgramGenerator.swift`) — needs Apple Intelligence device.
- Exercise tutorial videos: `Models/ExerciseVideos.swift` (generated from web `src/data/exercise-videos.js`, 92 IDs), `Views/YouTubeEmbed.swift`.

## Unverified (build-only, not run)
- Full-width `GymPage` fix (white side bars on Progress / exercise detail).
- YouTube embed fix: was error 152; now youtube-nocookie URL with Referer/origin `aceface90.github.io` + "Open in YouTube" link. Confirm a video plays.
- Past-workout editing, RPE, notes round-trip with the web app.
- AI program generation on a real device.
- User still needs to click Xcode's "Update to recommended settings" (rewrites the project file) and commit it.

## Known gaps
- Uploaded `viewerIds` = only own uid, so connected trainers cannot see iOS workouts. Need `trainer_clients` lookup (query clientId == `google-<uid>`, both statuses `accepted`, collect `trainerId`) as in web `getSessionViewerIds`.
- Restored sessions lose program link; editing can't add sets/exercises to finished workouts; finished-before-this-change workouts have no stored duration (estimated).

## Next steps
1. Trainer visibility (viewerIds lookup).
2. Profile: height, weight, BMI, TDEE, goals.
3. Exercises: muscle/category filters.
4. Program editor: rep ranges, rest seconds, reorder; per-exercise rest timer.
5. Home dashboard (today's program day), `users/{uid}` backup blob, Gemini-free AI photo-to-exercise, trainer/client system.
6. Re-enable HealthKit when on a paid account.

## Gotchas
- Active developer dir is Command Line Tools: always set `DEVELOPER_DIR`.
- Don't rewrite files with Python `open(p,'w').write(open(p).read())` (truncates).
- `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`: mark pure value types/initialisers `nonisolated` when used off-main.
- Simulator log noise (`[C:1]`, PointerUI, "cannot add handler") is harmless.
