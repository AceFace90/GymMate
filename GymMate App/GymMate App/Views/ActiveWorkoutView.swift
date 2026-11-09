import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(WorkoutStore.self) private var store
    @Binding var session: WorkoutSession
    @State private var picking = false
    @State private var confirmCancel = false
    @State private var restEnd: Date?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .firstTextBaseline) {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in
                            Text(elapsed(ctx.date)).font(.system(size: 34, weight: .bold)).monospacedDigit()
                        }
                        Spacer()
                        Text("\(Units.text(session.volume)) lifted").gymEyebrow()
                    }

                    if let end = restEnd {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in
                            let left = Int(end.timeIntervalSince(ctx.date).rounded(.up))
                            if left > 0 {
                                HStack {
                                    Image(systemName: "timer")
                                    Text("Rest \(left / 60):\(String(format: "%02d", left % 60))")
                                        .monospacedDigit().font(.headline)
                                    Spacer()
                                    Button("Skip") { restEnd = nil }.font(.subheadline.weight(.semibold))
                                }
                                .padding(14)
                                .background(GymColor.accent.opacity(0.15), in: .rect(cornerRadius: GymMetrics.chipRadius, style: .continuous))
                                .foregroundStyle(GymColor.accent)
                            }
                        }
                    }

                    ForEach(session.exerciseIds, id: \.self) { exId in
                        exerciseCard(exId)
                    }

                    GymCard {
                        Text("Notes").gymEyebrow()
                        TextField("How did it go?", text: Binding(get: { session.notes ?? "" }, set: { session.notes = $0 }), axis: .vertical)
                            .lineLimit(1...4)
                    }

                    Button { picking = true } label: {
                        Label("Add exercise", systemImage: "plus")
                            .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 14)
                    }
                    .buttonStyle(.bordered).tint(GymColor.accent)
                }
                .padding(GymMetrics.pagePadding)
            }
            .background(GymColor.canvas.ignoresSafeArea())
            .navigationTitle("Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .destructive) { confirmCancel = true }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Finish") { Task { await store.finishWorkout() } }
                        .bold().disabled(session.completedSets == 0)
                }
            }
            .confirmationDialog("Discard this workout?", isPresented: $confirmCancel, titleVisibility: .visible) {
                Button("Discard workout", role: .destructive) { store.cancelWorkout() }
            }
            .sheet(isPresented: $picking) {
                ExercisePicker { store.addSet(exercise: $0); picking = false }
            }
            .onChange(of: session) { store.save() }
        }
        .tint(GymColor.accent)
        .interactiveDismissDisabled()
    }

    private func elapsed(_ now: Date) -> String {
        let s = max(0, Int(now.timeIntervalSince(session.startedAt)))
        return String(format: "%d:%02d", s / 60, s % 60)
    }

    @ViewBuilder private func exerciseCard(_ exId: UUID) -> some View {
        let ex = store.exercise(exId)
        GymCard {
            HStack {
                Text(session.sets.first { $0.exerciseId == exId }?.exerciseName ?? "Exercise")
                    .font(.title3.weight(.semibold))
                Spacer()
                if let m = ex?.muscle { Text(m.title).font(.caption.weight(.semibold)).foregroundStyle(m.color) }
            }
            HStack {
                Text("SET").frame(width: 36, alignment: .leading)
                Text(Units.label.uppercased()).frame(maxWidth: .infinity)
                Text("REPS").frame(maxWidth: .infinity)
                Text("RPE").frame(width: 44)
                Spacer().frame(width: 44)
            }
            .font(.caption.weight(.semibold)).foregroundStyle(.secondary)

            ForEach($session.sets) { $set in
                if set.exerciseId == exId {
                    HStack {
                        Text("\(set.setNumber)").frame(width: 36, alignment: .leading).foregroundStyle(.secondary)
                        TextField("0", value: Binding(get: { Units.display(set.weightKg) }, set: { set.weightKg = Units.toKg($0) }), format: .number)
                            .keyboardType(.decimalPad).multilineTextAlignment(.center)
                            .padding(8).background(GymColor.track, in: .rect(cornerRadius: 10))
                        TextField("0", value: $set.reps, format: .number)
                            .keyboardType(.numberPad).multilineTextAlignment(.center)
                            .padding(8).background(GymColor.track, in: .rect(cornerRadius: 10))
                        RPEMenu(rpe: $set.rpe)
                        Button {
                            set.completed.toggle()
                            restEnd = set.completed ? Date().addingTimeInterval(90) : nil
                        } label: {
                            Image(systemName: set.completed ? "checkmark.circle.fill" : "circle")
                                .font(.title2).foregroundStyle(set.completed ? GymColor.good : .secondary)
                        }
                        .buttonStyle(.plain).frame(width: 44)
                        .sensoryFeedback(.success, trigger: set.completed)
                    }
                }
            }
            Button {
                if let ex { store.addSet(exercise: ex) }
            } label: {
                Label("Add set", systemImage: "plus").font(.subheadline.weight(.semibold))
            }
        }
    }
}

struct ExercisePicker: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    var onPick: (Exercise) -> Void

    var body: some View {
        NavigationStack {
            ExerciseList(query: query, onPick: onPick)
                .searchable(text: $query)
                .navigationTitle("Add exercise")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
        .tint(GymColor.accent)
    }
}

struct RPEMenu: View {
    @Binding var rpe: Int?
    var body: some View {
        Menu {
            Button("None") { rpe = nil }
            ForEach(5...10, id: \.self) { n in Button("\(n)") { rpe = n } }
        } label: {
            Text(rpe.map(String.init) ?? "–")
                .font(.subheadline.weight(.semibold)).monospacedDigit()
                .frame(width: 36, height: 36)
                .background(GymColor.track, in: .rect(cornerRadius: 10))
                .foregroundStyle(rpe == nil ? .secondary : GymColor.accent)
        }
        .frame(width: 44)
    }
}
