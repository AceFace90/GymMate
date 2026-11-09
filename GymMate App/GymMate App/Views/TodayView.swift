import SwiftUI

struct TodayView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(AuthService.self) private var auth
    @State private var newRoutine = false
    @AppStorage(Units.key) private var unitsKey = ""

    @ViewBuilder private var routinesSection: some View {
        HStack {
            Text("Routines").font(.title3.weight(.semibold))
            Spacer()
            Button("New", systemImage: "plus") { newRoutine = true }.font(.subheadline.weight(.semibold))
        }
        .padding(.top, 4)
        if store.routines.isEmpty {
            ContentUnavailableView {
                Label("No routines yet", systemImage: "list.bullet.rectangle")
            } description: {
                Text("Save a set of exercises to start it in one tap.")
            } actions: {
                Button("New routine") { newRoutine = true }.buttonStyle(.glassProminent).tint(GymColor.accent)
            }
        }
        ForEach(store.routines) { r in
            GymCard {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.name).font(.headline)
                        Text("\(r.exerciseIds.count) exercises").gymEyebrow()
                    }
                    Spacer()
                    Button("Start") { store.startWorkout(routine: r) }
                        .buttonStyle(.bordered).tint(GymColor.accent)
                }
            }
            .contextMenu { Button("Delete", role: .destructive) { store.deleteRoutine(r.id) } }
        }
    }

    private var greetingLine: String {
        if let name = GymGreeting.firstName(of: auth.user?.displayName) {
            return "\(GymGreeting.timeOfDay()), \(name)"
        }
        return GymGreeting.timeOfDay()
    }

    /// Last 7 days, mirroring the web "This week" stats.
    private var summaryChips: some View {
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        let recent = store.finished.filter { $0.startedAt >= cutoff }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                GymSummaryChip(title: "Workouts", value: "\(recent.count)", symbol: "figure.strengthtraining.traditional")
                GymSummaryChip(title: "Sets", value: "\(recent.reduce(0) { $0 + $1.completedSets })", symbol: "checklist")
                GymSummaryChip(title: "Volume", value: Units.text(recent.reduce(0) { $0 + $1.volume }), symbol: "scalemass")
            }
            .padding(.horizontal, GymMetrics.pagePadding)
        }
    }

    private var activeBinding: Binding<WorkoutSession>? {
        Binding(get: { store.active }, set: { store.active = $0 }).unwrapped
    }

    var body: some View {
        NavigationStack {
            GymPage {
                Text("Today").gymHeadline().padding(.top, 8)

                summaryChips
                    .padding(.horizontal, -GymMetrics.pagePadding)

                Text(greetingLine).gymEyebrow()
                Text(store.finished.isEmpty ? "Start your first workout." : "\(store.finished.count) workouts logged.")
                    .gymNarrative()

                Button {
                    store.startWorkout()
                } label: {
                    Label(store.active == nil ? "Start workout" : "Resume workout",
                          systemImage: "figure.strengthtraining.traditional")
                        .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent).controlSize(.large).tint(GymColor.accent)

                routinesSection

                if !store.finished.isEmpty {
                    Text("Recent").font(.title3.weight(.semibold)).padding(.top, 4)
                    ForEach(store.finished.prefix(10)) { s in
                        NavigationLink(value: s) {
                            GymCard {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(s.startedAt.formatted(.dateTime.weekday(.wide).day().month()))
                                            .font(.headline)
                                        Text("\(s.completedSets) sets · \(Units.text(s.volume))")
                                            .gymEyebrow()
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $newRoutine) { NewRoutineSheet() }
            .navigationDestination(for: WorkoutSession.self) { WorkoutDetailView(session: $0) }
            .fullScreenCover(isPresented: .constant(store.active != nil)) {
                if let binding = activeBinding { ActiveWorkoutView(session: binding) }
            }
        }
    }
}

private extension Binding where Value == WorkoutSession? {
    var unwrapped: Binding<WorkoutSession>? { Binding<WorkoutSession>(self) }
}

struct WorkoutDetailView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let session: WorkoutSession
    @State private var draft: WorkoutSession
    @State private var editing = false
    @State private var confirmDelete = false
    @AppStorage(Units.key) private var units = ""

    init(session: WorkoutSession) {
        self.session = session
        _draft = State(initialValue: session)
    }

    private var shown: WorkoutSession { editing ? draft : (store.sessions.first { $0.id == session.id } ?? session) }

    var body: some View {
        GymPage {
            Text(shown.startedAt.formatted(.dateTime.weekday(.wide).day().month().year())).gymEyebrow()
            Text(Units.text(shown.volume)).gymHeadline()
            Text("\(shown.duration / 60) min · \(shown.completedSets) sets").gymNarrative()

            ForEach(shown.exerciseIds, id: \.self) { id in
                GymCard {
                    Text(shown.sets.first { $0.exerciseId == id }?.exerciseName ?? "").font(.title3.weight(.semibold))
                    if editing {
                        ForEach($draft.sets) { $s in
                            if s.exerciseId == id {
                                HStack {
                                    Text("\(s.setNumber)").frame(width: 28, alignment: .leading).foregroundStyle(.secondary)
                                    TextField("0", value: Binding(get: { Units.display(s.weightKg) }, set: { s.weightKg = Units.toKg($0) }), format: .number)
                                        .keyboardType(.decimalPad).multilineTextAlignment(.center)
                                        .padding(8).background(GymColor.track, in: .rect(cornerRadius: 10))
                                    TextField("0", value: $s.reps, format: .number)
                                        .keyboardType(.numberPad).multilineTextAlignment(.center)
                                        .padding(8).background(GymColor.track, in: .rect(cornerRadius: 10))
                                    RPEMenu(rpe: $s.rpe)
                                    Button { let sid = s.id; draft.sets.removeAll { $0.id == sid } } label: {
                                        Image(systemName: "minus.circle.fill").foregroundStyle(GymColor.critical)
                                    }.buttonStyle(.plain)
                                }
                            }
                        }
                    } else {
                        ForEach(shown.sets.filter { $0.exerciseId == id }) { s in
                            HStack {
                                Text("Set \(s.setNumber)").foregroundStyle(.secondary)
                                Spacer()
                                if s.isPR == true {
                                    Label("PR", systemImage: "trophy.fill")
                                        .font(.caption.weight(.bold)).foregroundStyle(GymColor.accent)
                                }
                                if let r = s.rpe { Text("RPE \(r)").font(.caption).foregroundStyle(.secondary) }
                                Text("\(Units.text(s.weightKg)) × \(s.reps)").monospacedDigit()
                            }
                        }
                    }
                }
            }

            GymCard {
                Text("Notes").gymEyebrow()
                if editing {
                    TextField("Add notes", text: Binding(get: { draft.notes ?? "" }, set: { draft.notes = $0 }), axis: .vertical)
                        .lineLimit(1...6)
                } else if let n = shown.notes, !n.isEmpty {
                    Text(n)
                } else {
                    Text("No notes").foregroundStyle(.secondary)
                }
            }

            Button("Delete workout", role: .destructive) { confirmDelete = true }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                if editing {
                    Button("Save") { store.updateSession(draft); editing = false }.bold()
                } else {
                    Button("Edit") { draft = store.sessions.first { $0.id == session.id } ?? session; editing = true }
                }
            }
            if editing {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { editing = false } }
            }
        }
        .confirmationDialog("Delete this workout?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete workout", role: .destructive) { store.deleteSession(session.id); dismiss() }
        }
    }
}
