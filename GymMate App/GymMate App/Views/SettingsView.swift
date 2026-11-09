import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthService.self) private var auth
    @Environment(WorkoutStore.self) private var store
    @State private var signInError: String?
    @AppStorage(Units.key) private var units = Units.isImperial ? "imperial" : "metric"
    @AppStorage("gymmate_appearance") private var appearance = AppearancePreference.system.rawValue

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if let u = auth.user {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(u.displayName ?? "Signed in").font(.headline)
                            if let e = u.email { Text(e).font(.subheadline).foregroundStyle(.secondary) }
                        }
                        Button("Sync now") { Task { await store.syncDown() } }
                        Button("Sign out", role: .destructive) { try? auth.signOut() }
                    } else if auth.isCloudAvailable {
                        Button("Sign in with Google") {
                            Task { do { try await auth.signInWithGoogle() } catch { signInError = error.localizedDescription } }
                        }
                        Text("Sign in to sync workouts with the GymMate web app.").font(.footnote).foregroundStyle(.secondary)
                    } else {
                        Text("Cloud sync isn't configured.").foregroundStyle(.secondary)
                    }
                    if let signInError { Text(signInError).font(.footnote).foregroundStyle(GymColor.critical) }
                }
                Section {
                    NavigationLink("Profile & goals") { ProfileView() }
                }
                Section("Appearance") {
                    Picker("Theme", selection: $appearance) {
                        ForEach(AppearancePreference.allCases) { Text($0.title).tag($0.rawValue) }
                    }.pickerStyle(.segmented)
                }
                Section("Units") {
                    Picker("Weight", selection: $units) {
                        Text("Metric (kg)").tag("metric")
                        Text("Imperial (lb)").tag("imperial")
                    }.pickerStyle(.segmented)
                }
                Section { Text("Weights are stored in kg and converted for display.").font(.footnote).foregroundStyle(.secondary) }
            }
            .navigationTitle("Settings").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .tint(GymColor.accent)
    }
}
