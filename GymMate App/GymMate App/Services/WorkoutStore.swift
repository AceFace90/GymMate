import Foundation
import Observation
import FirebaseFirestore

/// Local source of truth (JSON in Application Support). Firestore sync is layered on later.
@Observable
final class WorkoutStore {
    var exercises: [Exercise] = ExerciseSeed.all
    var sessions: [WorkoutSession] = []
    var routines: [Routine] = []
    var programs: [Program] = []
    var active: WorkoutSession?
    @ObservationIgnored let health = HealthKitService()
    /// Firebase uid when signed in; nil means local-only.
    @ObservationIgnored var cloudUid: String?

    /// Bump when the on-disk / exported shape changes, and add a step to `migrate(_:)`.
    static let currentSchemaVersion = 1

    private struct Snapshot: Codable {
        var schemaVersion: Int?    // nil = written before versioning (treated as 0)
        var exercises: [Exercise]
        var sessions: [WorkoutSession]
        var routines: [Routine]?   // optional: older files predate routines
        var programs: [Program]?
        var active: WorkoutSession?
    }

    private var fileURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("gymmate.json")
    }

    init() { load() }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              var snap = try? JSONDecoder().decode(Snapshot.self, from: data) else { return }
        Self.migrate(&snap)
        // Keep the user's custom exercises and any old ones history still points at, then add the
        // full built-in library for names we don't already have.
        let used = Set(snap.sessions.flatMap(\.sets).map(\.exerciseId)
                       + (snap.routines ?? []).flatMap(\.exerciseIds)
                       + (snap.active?.sets.map(\.exerciseId) ?? []))
        var merged = snap.exercises.filter { $0.isCustom || used.contains($0.id) }
        let have = Set(merged.map { $0.name.lowercased() })
        merged += ExerciseSeed.all.filter { !have.contains($0.name.lowercased()) }
        exercises = merged
        sessions = snap.sessions
        routines = snap.routines ?? []
        programs = snap.programs ?? []
        active = snap.active
    }

    /// Upgrades older snapshots step by step to `currentSchemaVersion`.
    private static func migrate(_ snap: inout Snapshot) {
        var v = snap.schemaVersion ?? 0
        // v0 -> v1: versioning introduced; no shape change.
        if v < 1 { v = 1 }
        snap.schemaVersion = v
    }

    func save() {
        let snap = Snapshot(schemaVersion: Self.currentSchemaVersion, exercises: exercises, sessions: sessions, routines: routines, programs: programs, active: active)
        if let data = try? JSONEncoder().encode(snap) { try? data.write(to: fileURL, options: .atomic) }
        pushLibraryIfChanged()
    }

    // MARK: Export

    private struct Export: Codable {
        var schemaVersion: Int
        var exportedAt: Date
        var exercises: [Exercise]
        var sessions: [WorkoutSession]
        var routines: [Routine]
        var programs: [Program]
    }

    /// Writes a pretty-printed JSON backup to a temp file and returns its URL (for ShareLink).
    func exportJSON() -> URL? {
        let out = Export(schemaVersion: Self.currentSchemaVersion, exportedAt: .now, exercises: exercises,
                         sessions: sessions, routines: routines, programs: programs)
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? enc.encode(out) else { return nil }
        let stamp = ISO8601DateFormatter().string(from: .now).prefix(10)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("gymmate-backup-\(stamp).json")
        do { try data.write(to: url, options: .atomic); return url } catch { return nil }
    }

    // MARK: Library cloud backup (routines, programs, custom exercises)

    @ObservationIgnored private var lastLibraryJSON: Data?

    private func libraryPayload() -> LibraryPayload {
        LibraryPayload(schemaVersion: Self.currentSchemaVersion,
                       customExercises: exercises.filter(\.isCustom), routines: routines, programs: programs)
    }

    private func pushLibraryIfChanged() {
        guard let uid = cloudUid else { return }
        let payload = libraryPayload()
        guard let data = try? JSONEncoder().encode(payload), data != lastLibraryJSON else { return }
        lastLibraryJSON = data
        Task { await CloudSync.uploadLibrary(payload, uid: uid) }
    }

    var finished: [WorkoutSession] {
        sessions.filter { $0.completedAt != nil }.sorted { $0.startedAt > $1.startedAt }
    }

    func exercise(_ id: UUID) -> Exercise? { exercises.first { $0.id == id } }

    /// Last completed weight/reps for an exercise, used to pre-fill new sets.
    func lastSet(for exerciseId: UUID) -> LoggedSet? {
        finished.lazy.compactMap { $0.sets.last { $0.exerciseId == exerciseId && $0.completed } }.first
    }

    // MARK: Workout lifecycle

    func startWorkout(name: String = "Workout") {
        active = WorkoutSession(name: name)
        save()
    }

    func addSet(exercise: Exercise) {
        guard var session = active else { return }
        let n = session.sets.filter { $0.exerciseId == exercise.id }.count + 1
        let prev = session.sets.last { $0.exerciseId == exercise.id } ?? lastSet(for: exercise.id)
        session.sets.append(LoggedSet(exerciseId: exercise.id, exerciseName: exercise.name, setNumber: n,
                                      weightKg: prev?.weightKg ?? 0, reps: prev?.reps ?? 0))
        active = session
        save()
    }

    func cancelWorkout() {
        active = nil
        save()
    }

    /// Saves the workout and writes it to Apple Health when it has at least one completed set.
    func finishWorkout() async {
        guard var session = active else { return }
        session.sets.removeAll { !$0.completed }
        markPRs(&session)
        // A manually entered duration wins over the live timer; end time follows from it.
        let seconds = session.durationSeconds ?? max(0, Int(Date().timeIntervalSince(session.startedAt)))
        session.durationSeconds = seconds
        session.completedAt = session.startedAt.addingTimeInterval(Double(seconds))
        active = nil
        if !session.sets.isEmpty {
            sessions.append(session)
            if let uid = cloudUid { let s = session; Task { await CloudSync.upload(s, uid: uid) } }
            // HealthKit write paused for now (see HealthKitService); re-enable later.
        }
        save()
    }

    /// Flags the heaviest completed set per exercise when it beats every earlier session.
    private func markPRs(_ session: inout WorkoutSession) {
        for id in session.exerciseIds {
            let prior = sessions.flatMap(\.sets)
                .filter { $0.exerciseId == id && $0.completed }.map(\.weightKg).max() ?? 0
            let sets = session.sets.indices.filter { session.sets[$0].exerciseId == id }
            guard let best = sets.max(by: { session.sets[$0].weightKg < session.sets[$1].weightKg }),
                  session.sets[best].weightKg > prior, prior > 0 else { continue }
            session.sets[best].isPR = true
        }
    }

    // MARK: Programs

    func addProgram(name: String, details: String) {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty else { return }
        programs.append(Program(name: n, details: details, days: [ProgramDay(name: "Day 1")], isActive: programs.isEmpty))
        save()
    }

    func addGenerated(_ program: Program) {
        var p = program
        p.isActive = programs.isEmpty
        programs.append(p)
        save()
    }

    func updateProgram(_ program: Program) {
        guard let i = programs.firstIndex(where: { $0.id == program.id }) else { return }
        programs[i] = program
        save()
    }

    func deleteProgram(_ id: UUID) {
        let wasActive = programs.first { $0.id == id }?.isActive == true
        programs.removeAll { $0.id == id }
        if wasActive, !programs.isEmpty { programs[0].isActive = true }
        save()
    }

    /// Only one program is active at a time.
    func setActive(_ id: UUID) {
        for i in programs.indices { programs[i].isActive = programs[i].id == id }
        save()
    }

    var activeProgram: Program? { programs.first { $0.isActive } }

    func startWorkout(day: ProgramDay, program: Program) {
        var session = WorkoutSession(name: day.name)
        session.programId = program.id
        active = session
        for pe in day.exercises {
            guard let ex = exercise(pe.exerciseId) else { continue }
            for _ in 0..<max(1, pe.sets) { addSet(exercise: ex) }
        }
        save()
    }

    func startWorkout(routine: Routine) {
        active = WorkoutSession(name: routine.name)
        for id in routine.exerciseIds { if let ex = exercise(id) { addSet(exercise: ex) } }
        save()
    }

    func addRoutine(name: String, exerciseIds: [UUID]) {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty, !exerciseIds.isEmpty else { return }
        routines.append(Routine(name: n, exerciseIds: exerciseIds))
        save()
    }

    func deleteRoutine(_ id: UUID) {
        routines.removeAll { $0.id == id }
        save()
    }

    /// Saves edits to a finished workout, renumbers sets, refreshes PR flags and re-uploads.
    func updateSession(_ edited: WorkoutSession) {
        guard let i = sessions.firstIndex(where: { $0.id == edited.id }) else { return }
        var s = edited
        if s.completedAt != nil, let d = s.durationSeconds { s.completedAt = s.startedAt.addingTimeInterval(Double(d)) }
        s.sets.removeAll { !$0.completed && $0.weightKg == 0 && $0.reps == 0 }
        var counts: [UUID: Int] = [:]
        for k in s.sets.indices {
            counts[s.sets[k].exerciseId, default: 0] += 1
            s.sets[k].setNumber = counts[s.sets[k].exerciseId]!
            s.sets[k].isPR = nil
        }
        sessions[i] = s
        // Recompute PR flags chronologically so edits can't leave stale badges.
        var best: [UUID: Double] = [:]
        for idx in sessions.indices.sorted(by: { sessions[$0].startedAt < sessions[$1].startedAt }) {
            for id in sessions[idx].exerciseIds {
                let mine = sessions[idx].sets.indices.filter { sessions[idx].sets[$0].exerciseId == id && sessions[idx].sets[$0].completed }
                for k in mine { sessions[idx].sets[k].isPR = nil }
                guard let top = mine.max(by: { sessions[idx].sets[$0].weightKg < sessions[idx].sets[$1].weightKg }) else { continue }
                let w = sessions[idx].sets[top].weightKg
                if let prior = best[id], w > prior { sessions[idx].sets[top].isPR = true }
                best[id] = max(best[id] ?? 0, w)
            }
        }
        save()
        if let uid = cloudUid { let out = sessions[i]; Task { await CloudSync.upload(out, uid: uid) } }
    }

    func deleteSession(_ id: UUID) {
        sessions.removeAll { $0.id == id }
        save()
        if let uid = cloudUid { Task { await CloudSync.delete(id, uid: uid) } }
    }

    /// Pulls sessions from Firestore (web or other devices), merges missing ones, pushes local-only ones.
    func syncDown() async {
        guard let uid = cloudUid else { return }
        let docs = await CloudSync.fetch(uid: uid)
        var known = Set(sessions.map(\.id))
        var byName = Dictionary(exercises.map { ($0.name.lowercased(), $0) }, uniquingKeysWith: { a, _ in a })
        var byId = Dictionary(exercises.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        for d in docs {
            guard let local = d["localSessionId"] else { continue }
            let id = CloudSync.uuid(from: "\(local)")
            guard known.insert(id).inserted else { continue }
            let start = (d["startedAt"] as? Timestamp)?.dateValue() ?? .now
            let end = (d["completedAt"] as? Timestamp)?.dateValue() ?? start
            var sets: [LoggedSet] = []
            for x in (d["sets"] as? [[String: Any]]) ?? [] {
                guard let name = x["exerciseName"] as? String else { continue }
                let ex: Exercise
                // Prefer the stable id (iOS-written docs); fall back to name for web-written docs.
                if let raw = x["exerciseId"] as? String, let eid = UUID(uuidString: raw), let e = byId[eid] { ex = e }
                else if let e = byName[name.lowercased()] { ex = e }
                else {
                    let eid = (x["exerciseId"] as? String).flatMap(UUID.init(uuidString:)) ?? UUID()
                    ex = Exercise(id: eid, name: name, muscle: .fullBody, isCustom: true)
                    exercises.append(ex); byName[name.lowercased()] = ex; byId[ex.id] = ex
                }
                sets.append(LoggedSet(exerciseId: ex.id, exerciseName: ex.name,
                                      setNumber: (x["setNumber"] as? Int) ?? sets.count + 1,
                                      weightKg: (x["weightKg"] as? Double) ?? 0, reps: (x["reps"] as? Int) ?? 0,
                                      completed: (x["completed"] as? Bool) ?? true, isPR: x["isPR"] as? Bool,
                                      rpe: x["rpe"] as? Int))
            }
            sessions.append(WorkoutSession(id: id, name: (d["dayName"] as? String) ?? "Workout",
                                           startedAt: start, completedAt: end, programId: nil, sets: sets,
                                           notes: d["notes"] as? String, durationSeconds: d["durationSeconds"] as? Int))
        }
        await restoreLibraryIfEmpty(uid: uid)
        save()
        let remote = Set(docs.compactMap { ($0["localSessionId"]).map { CloudSync.uuid(from: "\($0)") } })
        for s in sessions where s.completedAt != nil && !remote.contains(s.id) { await CloudSync.upload(s, uid: uid) }
        await CloudSync.backfillViewers(docs: docs, uid: uid)
    }

    /// New device / fresh install: pull routines, programs and custom exercises. Otherwise local wins
    /// (and is pushed by `save()`), so deletions are never resurrected.
    private func restoreLibraryIfEmpty(uid: String) async {
        guard routines.isEmpty, programs.isEmpty, !exercises.contains(where: \.isCustom),
              let lib = await CloudSync.fetchLibrary(uid: uid) else { return }
        let have = Set(exercises.map(\.id))
        exercises += lib.customExercises.filter { !have.contains($0.id) }
        routines = lib.routines
        programs = lib.programs
    }

    /// Wipes all local data and (when signed in) the user's cloud sessions. Profile prefs are cleared too.
    func deleteAllData() async {
        if let uid = cloudUid { await CloudSync.deleteAll(uid: uid); await CloudSync.deleteLibrary(uid: uid) }
        lastLibraryJSON = nil
        exercises = ExerciseSeed.all
        sessions = []; routines = []; programs = []; active = nil
        save()
        let d = UserDefaults.standard
        for k in d.dictionaryRepresentation().keys where k.hasPrefix("gymmate_profile_") { d.removeObject(forKey: k) }
    }

    func addCustomExercise(name: String, muscle: MuscleGroup) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        exercises.append(Exercise(name: trimmed, muscle: muscle, isCustom: true))
        save()
    }
}
