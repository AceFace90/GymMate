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

    private struct Snapshot: Codable {
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
              let snap = try? JSONDecoder().decode(Snapshot.self, from: data) else { return }
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

    func save() {
        let snap = Snapshot(exercises: exercises, sessions: sessions, routines: routines, programs: programs, active: active)
        if let data = try? JSONEncoder().encode(snap) { try? data.write(to: fileURL, options: .atomic) }
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
        let end = Date()
        session.completedAt = end
        session.durationSeconds = Int(end.timeIntervalSince(session.startedAt))
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
                if let e = byName[name.lowercased()] { ex = e } else {
                    ex = Exercise(name: name, muscle: .fullBody, isCustom: true)
                    exercises.append(ex); byName[name.lowercased()] = ex
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
        save()
        let remote = Set(docs.compactMap { ($0["localSessionId"]).map { CloudSync.uuid(from: "\($0)") } })
        for s in sessions where s.completedAt != nil && !remote.contains(s.id) { await CloudSync.upload(s, uid: uid) }
        await CloudSync.backfillViewers(docs: docs, uid: uid)
    }

    func addCustomExercise(name: String, muscle: MuscleGroup) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        exercises.append(Exercise(name: trimmed, muscle: muscle, isCustom: true))
        save()
    }
}
