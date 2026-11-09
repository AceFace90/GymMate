import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            Tab("Today", systemImage: "figure.strengthtraining.traditional") { TodayView() }
            Tab("Programs", systemImage: "calendar") { ProgramsView() }
            Tab("Exercises", systemImage: "list.bullet") { ExercisesView() }
            Tab("Progress", systemImage: "chart.bar.fill") { ProgressTabView() }
            Tab("Settings", systemImage: "gearshape.fill") { SettingsView() }
        }
        .tint(GymColor.accent)
    }
}

#Preview {
    ContentView().environment(WorkoutStore())
}
