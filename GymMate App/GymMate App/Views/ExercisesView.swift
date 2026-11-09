import SwiftUI

struct ExerciseList: View {
    @Environment(WorkoutStore.self) private var store
    var query: String
    var onPick: ((Exercise) -> Void)?

    private var filtered: [Exercise] {
        let q = query.trimmingCharacters(in: .whitespaces)
        return store.exercises.filter { q.isEmpty || $0.name.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        List {
            ForEach(MuscleGroup.allCases) { group in
                let items = filtered.filter { $0.muscle == group }
                if !items.isEmpty {
                    Section(group.title) {
                        ForEach(items) { ex in
                            let row = HStack {
                                Circle().fill(group.color).frame(width: 10, height: 10)
                                Text(ex.name).foregroundStyle(.primary)
                                if ex.isCustom { Text("Custom").font(.caption).foregroundStyle(.secondary) }
                            }
                            if let onPick {
                                Button { onPick(ex) } label: { row }
                            } else {
                                NavigationLink(value: ex) { row }
                            }
                        }
                    }
                }
            }
        }
    }
}

struct ExercisesView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var query = ""
    @State private var adding = false
    @State private var newName = ""
    @State private var newMuscle: MuscleGroup = .chest

    var body: some View {
        NavigationStack {
            ExerciseList(query: query)
                .navigationDestination(for: Exercise.self) { ExerciseDetailView(exercise: $0) }
                .searchable(text: $query)
                .navigationTitle("Exercises")
                .toolbar { ToolbarItem { Button("New", systemImage: "plus") { adding = true } } }
                .sheet(isPresented: $adding) {
                    NavigationStack {
                        Form {
                            TextField("Name", text: $newName)
                            Picker("Muscle group", selection: $newMuscle) {
                                ForEach(MuscleGroup.allCases) { Text($0.title).tag($0) }
                            }
                        }
                        .navigationTitle("New exercise")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { adding = false } }
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Add") {
                                    store.addCustomExercise(name: newName, muscle: newMuscle)
                                    newName = ""; adding = false
                                }
                                .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                            }
                        }
                    }
                    .presentationDetents([.medium])
                }
        }
    }
}
