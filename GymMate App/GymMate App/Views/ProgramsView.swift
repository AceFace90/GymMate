import SwiftUI

struct ProgramsView: View {
    @Environment(WorkoutStore.self) private var store
    @State private var adding = false
    @State private var aiSheet = false
    @State private var name = ""
    @State private var details = ""

    var body: some View {
        NavigationStack {
            GymPage {
                HStack {
                    Text("Programs").gymHeadline()
                    Spacer()
                    Button("AI", systemImage: "sparkles") { aiSheet = true }.font(.headline)
                    Button("New", systemImage: "plus") { adding = true }.font(.headline)
                }
                .padding(.top, 8)

                if store.programs.isEmpty {
                    Text("Create a program with training days, then start any day in one tap.").gymNarrative()
                }
                ForEach(store.programs) { p in
                    NavigationLink(value: p.id) {
                        GymCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(p.name).font(.headline).foregroundStyle(.primary)
                                    Text("\(p.days.count) days").gymEyebrow()
                                }
                                Spacer()
                                if p.isActive {
                                    Text("ACTIVE").font(.caption2.weight(.bold)).foregroundStyle(GymColor.accent)
                                        .padding(.horizontal, 8).padding(.vertical, 4)
                                        .background(GymColor.accent.opacity(0.15), in: .capsule)
                                }
                                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: UUID.self) { id in ProgramDetailView(programId: id) }
            .sheet(isPresented: $aiSheet) { AIProgramSheet() }
            .sheet(isPresented: $adding) {
                NavigationStack {
                    Form {
                        TextField("Name (e.g. Push Pull Legs)", text: $name)
                        TextField("Description (optional)", text: $details)
                    }
                    .navigationTitle("New program").navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { adding = false } }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Create") { store.addProgram(name: name, details: details); name = ""; details = ""; adding = false }
                                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    }
                }
                .presentationDetents([.medium])
            }
        }
        .tint(GymColor.accent)
    }
}

struct ProgramDetailView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let programId: UUID
    @State private var pickingDay: UUID?
    @State private var confirmDelete = false

    private var program: Program? { store.programs.first { $0.id == programId } }

    var body: some View {
        if let program {
            GymPage {
                Text(program.name).gymHeadline()
                if !program.details.isEmpty { Text(program.details).gymNarrative() }

                HStack {
                    if program.isActive {
                        Label("Active program", systemImage: "checkmark.circle.fill").foregroundStyle(GymColor.accent)
                    } else {
                        Button("Set as active") { store.setActive(program.id) }.buttonStyle(.bordered).tint(GymColor.accent)
                    }
                    Spacer()
                    Button("Add day", systemImage: "plus") {
                        var p = program
                        p.days.append(ProgramDay(name: "Day \(p.days.count + 1)"))
                        store.updateProgram(p)
                    }
                }

                ForEach(program.days) { day in dayCard(program, day) }

                Button("Delete program", role: .destructive) { confirmDelete = true }.padding(.top, 8)
            }
            .navigationBarTitleDisplayMode(.inline)
            .confirmationDialog("Delete \(program.name)?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete program", role: .destructive) { store.deleteProgram(program.id); dismiss() }
            }
            .sheet(item: Binding(get: { pickingDay.map(DayRef.init) }, set: { pickingDay = $0?.id })) { ref in
                ExercisePicker { ex in
                    var p = program
                    if let i = p.days.firstIndex(where: { $0.id == ref.id }) {
                        p.days[i].exercises.append(ProgramExercise(exerciseId: ex.id))
                        store.updateProgram(p)
                    }
                    pickingDay = nil
                }
            }
        }
    }

    private struct DayRef: Identifiable { let id: UUID }

    @ViewBuilder private func dayCard(_ program: Program, _ day: ProgramDay) -> some View {
        GymCard {
            HStack {
                TextField("Day name", text: dayName(program, day)).font(.title3.weight(.semibold))
                Spacer()
                Menu {
                    Button("Delete day", role: .destructive) {
                        var p = program; p.days.removeAll { $0.id == day.id }; store.updateProgram(p)
                    }
                } label: { Image(systemName: "ellipsis.circle").font(.title3) }
            }
            ForEach(day.exercises) { pe in
                HStack {
                    Text(store.exercise(pe.exerciseId)?.name ?? "Exercise").font(.subheadline)
                    Spacer()
                    Stepper("", value: setsBinding(program, day, pe), in: 1...10).labelsHidden().fixedSize()
                    Text("\(pe.sets) × \(pe.reps)").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                }
                .swipeActions { EmptyView() }
            }
            HStack {
                Button("Add exercise", systemImage: "plus") { pickingDay = day.id }.font(.subheadline.weight(.semibold))
                Spacer()
                Button("Start") { store.startWorkout(day: day, program: program) }
                    .buttonStyle(.borderedProminent).tint(GymColor.accent)
                    .disabled(day.exercises.isEmpty)
            }
        }
    }

    private func dayName(_ program: Program, _ day: ProgramDay) -> Binding<String> {
        Binding(get: { day.name }, set: { new in
            var p = program
            if let i = p.days.firstIndex(where: { $0.id == day.id }) { p.days[i].name = new; store.updateProgram(p) }
        })
    }

    private func setsBinding(_ program: Program, _ day: ProgramDay, _ pe: ProgramExercise) -> Binding<Int> {
        Binding(get: { pe.sets }, set: { new in
            var p = program
            if let d = p.days.firstIndex(where: { $0.id == day.id }),
               let e = p.days[d].exercises.firstIndex(where: { $0.id == pe.id }) {
                p.days[d].exercises[e].sets = new
                store.updateProgram(p)
            }
        })
    }
}
