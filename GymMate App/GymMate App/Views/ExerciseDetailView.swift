import SwiftUI
import Charts

struct ExerciseDetailView: View {
    @Environment(WorkoutStore.self) private var store
    let exercise: Exercise
    @AppStorage(Units.key) private var units = ""

    private struct Point: Identifiable { let id: Date; let maxKg: Double; let volume: Double; let sets: Int }

    private var history: [Point] {
        store.finished.reversed().compactMap { s in
            let sets = s.sets.filter { $0.exerciseId == exercise.id && $0.completed }
            guard !sets.isEmpty else { return nil }
            return Point(id: s.startedAt, maxKg: sets.map(\.weightKg).max() ?? 0,
                         volume: sets.reduce(0) { $0 + $1.volume }, sets: sets.count)
        }
    }

    var body: some View {
        GymPage {
            Text(exercise.name).gymHeadline()
            HStack(spacing: 8) {
                Text(exercise.muscle.title).font(.caption.weight(.semibold)).foregroundStyle(exercise.muscle.color)
                if let c = exercise.category { Text(c.capitalized).font(.caption).foregroundStyle(.secondary) }
            }
            if let i = exercise.instructions { Text(i).gymNarrative() }

            if let vid = ExerciseVideos.byName[exercise.name] {
                GymCard {
                    Text("Tutorial video").gymEyebrow()
                    YouTubeEmbed(videoId: vid)
                        .aspectRatio(9.0 / 16.0, contentMode: .fit)
                        .frame(maxWidth: 260)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .frame(maxWidth: .infinity)
                    Link("Open in YouTube", destination: URL(string: "https://www.youtube.com/shorts/\(vid)")!)
                        .font(.subheadline.weight(.semibold))
                }
            }

            if history.isEmpty {
                Text("No completed sets yet.").gymEyebrow()
            } else {
                GymCard {
                    Text("Strength progress (\(Units.label))").gymEyebrow()
                    Chart(history) {
                        LineMark(x: .value("Date", $0.id), y: .value("Max", Units.display($0.maxKg)))
                            .foregroundStyle(GymColor.accent)
                        PointMark(x: .value("Date", $0.id), y: .value("Max", Units.display($0.maxKg)))
                            .foregroundStyle(GymColor.accent)
                    }.frame(height: 180)
                }
                GymCard {
                    Text("History").gymEyebrow()
                    ForEach(history.reversed()) { p in
                        HStack {
                            Text(p.id.formatted(.dateTime.day().month())).foregroundStyle(.secondary)
                            Spacer()
                            Text("\(Units.text(p.maxKg)) · \(p.sets) sets").monospacedDigit()
                        }
                    }
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
