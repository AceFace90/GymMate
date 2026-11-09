import SwiftUI

struct NewRoutineSheet: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var picked: [UUID] = []
    @State private var picking = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Routine name (e.g. Push day)", text: $name)
                Section("Exercises") {
                    ForEach(picked, id: \.self) { id in
                        Text(store.exercise(id)?.name ?? "Exercise")
                    }
                    .onDelete { picked.remove(atOffsets: $0) }
                    .onMove { picked.move(fromOffsets: $0, toOffset: $1) }
                    Button("Add exercise", systemImage: "plus") { picking = true }
                }
            }
            .navigationTitle("New routine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { store.addRoutine(name: name, exerciseIds: picked); dismiss() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || picked.isEmpty)
                }
            }
            .sheet(isPresented: $picking) {
                ExercisePicker { ex in
                    if !picked.contains(ex.id) { picked.append(ex.id) }
                    picking = false
                }
            }
        }
        .tint(GymColor.accent)
    }
}
