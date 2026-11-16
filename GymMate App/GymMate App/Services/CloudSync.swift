import Foundation
import CryptoKit
import FirebaseFirestore

/// Routines, programs and custom exercises, backed up as one JSON blob per user.
struct LibraryPayload: Codable {
    var schemaVersion: Int
    var customExercises: [Exercise]
    var routines: [Routine]
    var programs: [Program]
}

/// Reads/writes completed workouts in the same `workout_sessions_cloud` collection the web app uses.
enum CloudSync {
    private static var col: CollectionReference { Firestore.firestore().collection("workout_sessions_cloud") }

    private static func docId(_ uid: String, _ sessionId: UUID) -> String { "session_\(uid)_\(sessionId.uuidString)" }

    /// The client plus every trainer with an accepted connection (mirrors web `getSessionViewerIds`).
    /// `trainer_clients.clientId` is stored as `google-<uid>`.
    private static func viewerIds(for uid: String) async -> [String] {
        var viewers: Set<String> = [uid]
        let gid = uid.hasPrefix("google-") ? uid : "google-\(uid)"
        do {
            let snap = try await Firestore.firestore().collection("trainer_clients")
                .whereField("clientId", isEqualTo: gid)
                .whereField("clientStatus", isEqualTo: "accepted")
                .whereField("trainerStatus", isEqualTo: "accepted")
                .getDocuments()
            for d in snap.documents {
                if let t = d.data()["trainerId"] as? String, !t.isEmpty { viewers.insert(t) }
            }
        } catch { print("[CloudSync] viewerIds lookup failed:", error) }
        return Array(viewers)
    }

    static func upload(_ s: WorkoutSession, uid: String) async {
        let sets = s.sets
        let viewers = await viewerIds(for: uid)
        let data: [String: Any] = [
            "clientId": uid,
            "viewerIds": viewers,
            "localSessionId": s.id.uuidString,
            "programId": s.programId?.uuidString ?? NSNull(),
            "programDayId": NSNull(),
            "dayName": s.name,
            "startedAt": Timestamp(date: s.startedAt),
            "completedAt": Timestamp(date: s.completedAt ?? s.startedAt),
            "uploadedAt": FieldValue.serverTimestamp(),
            "durationSeconds": s.duration,
            "notes": s.notes ?? "",
            "totalSets": sets.count,
            "completedSets": sets.filter(\.completed).count,
            "prCount": sets.filter { $0.isPR == true }.count,
            "exercises": Array(Set(sets.map(\.exerciseName))),
            "sets": sets.map { x -> [String: Any] in [
                "exerciseId": x.exerciseId.uuidString,
                "exerciseName": x.exerciseName,
                "setNumber": x.setNumber,
                "weightKg": x.weightKg > 0 ? x.weightKg : NSNull(),
                "reps": x.reps > 0 ? x.reps : NSNull(),
                "rpe": x.rpe ?? NSNull(),
                "completed": x.completed,
                "isPR": x.isPR == true,
            ] },
        ]
        do { try await col.document(docId(uid, s.id)).setData(data) }
        catch { print("[CloudSync] upload failed:", error) }
    }

    static func delete(_ id: UUID, uid: String) async {
        do { try await col.document(docId(uid, id)).delete() }
        catch { print("[CloudSync] delete failed:", error) }
    }

    /// All sessions for this user (including ones uploaded from the web app), as raw dictionaries.
    static func fetch(uid: String) async -> [[String: Any]] {
        do {
            let snap = try await col.whereField("clientId", isEqualTo: uid).getDocuments()
            return snap.documents.map { var d = $0.data(); d["_docId"] = $0.documentID; return d }
        } catch {
            print("[CloudSync] fetch failed:", error)
            return []
        }
    }

    /// Adds any current viewers (e.g. newly connected trainers) missing from already-uploaded docs.
    /// Mirrors the web self-heal in `workoutSync.js`. Takes docs from `fetch` (which carry `_docId`).
    static func backfillViewers(docs: [[String: Any]], uid: String) async {
        let viewers = await viewerIds(for: uid)
        for d in docs {
            guard let id = d["_docId"] as? String else { continue }
            let existing = (d["viewerIds"] as? [String]) ?? []
            let missing = viewers.filter { !existing.contains($0) }
            guard !missing.isEmpty else { continue }
            do { try await col.document(id).updateData(["viewerIds": FieldValue.arrayUnion(missing)]) }
            catch { print("[CloudSync] viewerIds backfill failed:", error) }
        }
    }

    /// Deletes every session doc this user owns. Returns false if any step failed.
    @discardableResult
    static func deleteAll(uid: String) async -> Bool {
        do {
            let snap = try await col.whereField("clientId", isEqualTo: uid).getDocuments()
            for d in snap.documents { try await d.reference.delete() }
            return true
        } catch { print("[CloudSync] deleteAll failed:", error); return false }
    }

    // MARK: Library backup (`gymmate_library_cloud/{uid}`; needs a matching Firestore rule)

    private static func libDoc(_ uid: String) -> DocumentReference {
        Firestore.firestore().collection("gymmate_library_cloud").document(uid)
    }

    static func uploadLibrary(_ lib: LibraryPayload, uid: String) async {
        guard let data = try? JSONEncoder().encode(lib), let json = String(data: data, encoding: .utf8) else { return }
        do {
            try await libDoc(uid).setData(["clientId": uid, "schemaVersion": lib.schemaVersion,
                                           "json": json, "updatedAt": FieldValue.serverTimestamp()])
        } catch { print("[CloudSync] uploadLibrary failed:", error) }
    }

    static func fetchLibrary(uid: String) async -> LibraryPayload? {
        do {
            let snap = try await libDoc(uid).getDocument()
            guard let json = snap.data()?["json"] as? String, let data = json.data(using: .utf8) else { return nil }
            return try JSONDecoder().decode(LibraryPayload.self, from: data)
        } catch { print("[CloudSync] fetchLibrary failed:", error); return nil }
    }

    static func deleteLibrary(uid: String) async {
        do { try await libDoc(uid).delete() } catch { print("[CloudSync] deleteLibrary failed:", error) }
    }

    /// Stable UUID for web ids that aren't UUIDs.
    static func uuid(from string: String) -> UUID {
        if let u = UUID(uuidString: string) { return u }
        let d = Array(Insecure.MD5.hash(data: Data(string.utf8)))
        return UUID(uuid: (d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], d[11], d[12], d[13], d[14], d[15]))
    }
}
