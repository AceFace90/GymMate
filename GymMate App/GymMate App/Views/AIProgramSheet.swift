import SwiftUI

struct AIProgramSheet: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var goal = "Build muscle"
    @State private var days = 4
    @State private var equipment = "Full gym"
    @State private var notes = ""
    @State private var busy = false
    @State private var error: String?

    private let goals = ["Build muscle", "Get stronger", "Lose fat", "General fitness"]

    var body: some View {
        NavigationStack {
            Form {
                if let why = ProgramGenerator.unavailableReason {
                    Section { Label(why, systemImage: "exclamationmark.triangle").foregroundStyle(.secondary) }
                }
                Section {
                    Picker("Goal", selection: $goal) { ForEach(goals, id: \.self) { Text($0) } }
                    Stepper("Days per week: \(days)", value: $days, in: 2...6)
                    TextField("Equipment (e.g. dumbbells only)", text: $equipment)
                    TextField("Notes (optional)", text: $notes)
                } footer: { Text("Runs privately on your device with Apple Intelligence.") }
                if let error { Section { Text(error).foregroundStyle(GymColor.critical) } }
                Section {
                    Button {
                        Task { await run() }
                    } label: {
                        HStack { if busy { ProgressView() }; Text(busy ? "Generating…" : "Generate program") }
                    }
                    .disabled(busy || ProgramGenerator.unavailableReason != nil)
                }
            }
            .navigationTitle("AI program").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }

    private func run() async {
        busy = true; error = nil
        defer { busy = false }
        do {
            let p = try await ProgramGenerator.generate(goal: goal, days: days, equipment: equipment, notes: notes, exercises: store.exercises)
            guard !p.days.isEmpty else { error = "The model returned no usable days. Try again."; return }
            store.addGenerated(p)
            dismiss()
        } catch {
            self.error = "Couldn't generate a program. Try again."
        }
    }
}
