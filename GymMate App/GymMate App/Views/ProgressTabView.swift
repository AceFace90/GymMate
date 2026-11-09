import SwiftUI
import Charts

struct ProgressTabView: View {
    @Environment(WorkoutStore.self) private var store
    @AppStorage(Units.key) private var units = ""

    private struct Week: Identifiable { let id: Date; let volume: Double }
    private struct Muscle: Identifiable { let id: MuscleGroup; let sets: Int; let volume: Double }
    private struct Record: Identifiable { let id: UUID; let name: String; let kg: Double; let reps: Int; let date: Date }

    private var weeks: [Week] {
        let cal = Calendar(identifier: .iso8601)
        let thisWeek = cal.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        return (0..<12).reversed().compactMap { back in
            guard let start = cal.date(byAdding: .weekOfYear, value: -back, to: thisWeek),
                  let end = cal.date(byAdding: .weekOfYear, value: 1, to: start) else { return nil }
            let v = store.finished.filter { $0.startedAt >= start && $0.startedAt < end }.reduce(0) { $0 + Units.display($1.volume) }
            return Week(id: start, volume: v)
        }
    }

    /// Sets and volume per muscle group over the last 30 days.
    private var muscles: [Muscle] {
        let since = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .now
        let sets = store.finished.filter { $0.startedAt >= since }.flatMap(\.sets).filter(\.completed)
        return MuscleGroup.allCases.compactMap { g in
            let mine = sets.filter { store.exercise($0.exerciseId)?.muscle == g }
            return mine.isEmpty ? nil : Muscle(id: g, sets: mine.count, volume: mine.reduce(0) { $0 + $1.volume })
        }.sorted { $0.volume > $1.volume }
    }

    /// Heaviest completed set per exercise; ties go to the earliest (matches the web app).
    private var records: [Record] {
        var best: [UUID: Record] = [:]
        for s in store.finished.reversed() {
            for set in s.sets where set.completed && set.weightKg > 0 {
                if let cur = best[set.exerciseId], cur.kg >= set.weightKg { continue }
                best[set.exerciseId] = Record(id: set.exerciseId, name: set.exerciseName, kg: set.weightKg, reps: set.reps, date: s.startedAt)
            }
        }
        return best.values.sorted { $0.kg > $1.kg }
    }

    var body: some View {
        NavigationStack {
            GymPage {
                Text("Progress").gymHeadline().padding(.top, 8)
                if store.finished.isEmpty {
                    Text("Log a workout to see your weekly volume here.").gymNarrative()
                } else {
                    GymCard {
                        Text("Weekly volume (\(Units.label))").gymEyebrow()
                        Chart(weeks) {
                            BarMark(x: .value("Week", $0.id, unit: .weekOfYear), y: .value("Volume", $0.volume))
                                .foregroundStyle(GymColor.accent).cornerRadius(6)
                        }.frame(height: 200)
                    }
                    if !muscles.isEmpty {
                        GymCard {
                            Text("Muscle groups · last 30 days").gymEyebrow()
                            let top = muscles.first?.volume ?? 1
                            ForEach(muscles) { m in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(m.id.title).font(.subheadline.weight(.semibold))
                                        Spacer()
                                        Text("\(m.sets) sets").font(.caption).foregroundStyle(.secondary)
                                    }
                                    GymBar(value: m.volume, goal: top, color: m.id.color)
                                }
                            }
                        }
                    }
                    if !records.isEmpty {
                        GymCard {
                            Text("Personal records").gymEyebrow()
                            ForEach(records.prefix(10)) { r in
                                HStack {
                                    Image(systemName: "trophy.fill").foregroundStyle(GymColor.accent)
                                    Text(r.name)
                                    Spacer()
                                    Text("\(Units.text(r.kg)) × \(r.reps)").monospacedDigit().foregroundStyle(.secondary)
                                }.font(.subheadline)
                            }
                        }
                    }
                    GymCard {
                        Text("All time").gymEyebrow()
                        Text("\(store.finished.count) workouts").font(.title2.weight(.bold))
                        Text("\(Units.text(store.finished.reduce(0) { $0 + $1.volume })) lifted").gymNarrative()
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
