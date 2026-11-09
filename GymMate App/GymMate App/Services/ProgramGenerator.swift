import Foundation
import FoundationModels

@Generable
struct GeneratedExercise {
    @Guide(description: "Exercise name copied exactly from the provided list")
    var name: String
    @Guide(description: "Number of sets", .range(1...6))
    var sets: Int
    @Guide(description: "Rep range such as 8-12 or 5")
    var reps: String
    @Guide(description: "Rest between sets in seconds", .range(30...240))
    var restSeconds: Int
}

@Generable
struct GeneratedDay {
    @Guide(description: "Day title such as Day 1 - Push")
    var name: String
    @Guide(description: "4 to 7 exercises", .count(4...7))
    var exercises: [GeneratedExercise]
}

@Generable
struct GeneratedProgram {
    var name: String
    @Guide(description: "One sentence description")
    var summary: String
    var days: [GeneratedDay]
}

/// Builds a Program with Apple's on-device model (no network, no API key).
enum ProgramGenerator {
    static var availability: SystemLanguageModel.Availability { SystemLanguageModel.default.availability }

    static var unavailableReason: String? {
        switch availability {
        case .available: return nil
        case .unavailable(.deviceNotEligible): return "This device doesn't support Apple Intelligence."
        case .unavailable(.appleIntelligenceNotEnabled): return "Turn on Apple Intelligence in Settings to use this."
        case .unavailable(.modelNotReady): return "The on-device model is still downloading. Try again soon."
        default: return "On-device AI isn't available right now."
        }
    }

    static func generate(goal: String, days: Int, equipment: String, notes: String, exercises: [Exercise]) async throws -> Program {
        let names = exercises.filter { !$0.isCustom }.map(\.name).joined(separator: ", ")
        let session = LanguageModelSession(instructions: "You are an expert personal trainer. Only use exercises from the provided list.")
        let prompt = """
        Create a \(days)-day per week gym program with exactly \(days) days.
        Goal: \(goal)
        Equipment available: \(equipment)
        \(notes.isEmpty ? "" : "Notes: \(notes)")
        Exercises you may use: \(names)
        """
        let out = try await session.respond(to: prompt, generating: GeneratedProgram.self).content

        let lookup = Dictionary(exercises.map { ($0.name.lowercased(), $0.id) }, uniquingKeysWith: { a, _ in a })
        let built: [ProgramDay] = out.days.prefix(days).map { d in
            ProgramDay(name: d.name, exercises: d.exercises.compactMap { e in
                guard let id = lookup[e.name.lowercased()] else { return nil }
                return ProgramExercise(exerciseId: id, sets: e.sets, reps: e.reps, restSeconds: e.restSeconds)
            })
        }.filter { !$0.exercises.isEmpty }
        return Program(name: out.name, details: out.summary, days: built)
    }
}
