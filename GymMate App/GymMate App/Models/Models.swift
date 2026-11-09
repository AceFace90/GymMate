import Foundation
import SwiftUI

nonisolated enum MuscleGroup: String, Codable, CaseIterable, Identifiable, Sendable {
    case chest, back, legs, shoulders, arms, core, cardio, mobility, fullBody
    var id: String { rawValue }
    var title: String {
        switch self {
        case .fullBody: "Full body"
        default: rawValue.capitalized
        }
    }
}

extension MuscleGroup {
    var color: Color {
        switch self {
        case .chest: GymColor.chest
        case .back: GymColor.back
        case .legs: GymColor.legs
        case .shoulders: GymColor.shoulders
        case .arms: GymColor.arms
        case .core: GymColor.core
        case .cardio: GymColor.cardio
        case .mobility: GymColor.mobility
        case .fullBody: GymColor.fullBody
        }
    }
}

nonisolated struct Exercise: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var name: String
    var muscle: MuscleGroup
    /// Optional so exercises saved before the full library still decode.
    var category: String?
    var instructions: String?
    var isCustom = false
}

nonisolated struct LoggedSet: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var exerciseId: UUID
    var exerciseName: String
    var setNumber: Int
    var weightKg: Double = 0
    var reps: Int = 0
    var completed = false
    /// Optional so data saved before PR tracking still decodes.
    var isPR: Bool?
    /// Rate of perceived exertion 1-10 (optional so older data decodes).
    var rpe: Int?
    var volume: Double { completed ? weightKg * Double(reps) : 0 }
}

nonisolated struct WorkoutSession: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var name = "Workout"
    var startedAt = Date()
    var completedAt: Date?
    var programId: UUID?
    var sets: [LoggedSet] = []
    var notes: String?
    var durationSeconds: Int?

    var duration: Int { durationSeconds ?? Int(((completedAt ?? startedAt).timeIntervalSince(startedAt))) }
    var volume: Double { sets.reduce(0) { $0 + $1.volume } }
    var completedSets: Int { sets.filter(\.completed).count }
    var exerciseIds: [UUID] {
        var seen = Set<UUID>(), out: [UUID] = []
        for s in sets where seen.insert(s.exerciseId).inserted { out.append(s.exerciseId) }
        return out
    }
}

nonisolated struct Routine: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var name: String
    var exerciseIds: [UUID]
}

nonisolated struct ProgramExercise: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var exerciseId: UUID
    var sets = 3
    var reps = "8-12"
    var restSeconds = 90
}

nonisolated struct ProgramDay: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var name: String
    var exercises: [ProgramExercise] = []
}

nonisolated struct Program: Identifiable, Codable, Hashable, Sendable {
    var id = UUID()
    var name: String
    var details = ""
    var days: [ProgramDay] = []
    var isActive = false
}
