import SwiftUI

struct SettingsView: View {
    @Environment(AuthService.self) private var auth
    @Environment(WorkoutStore.self) private var store
    @State private var signInError: String?
    @State private var confirmDeleteData = false
    @State private var confirmDeleteAccount = false
    @State private var busy = false
    @AppStorage(Units.key) private var units = Units.isImperial ? "imperial" : "metric"
    @AppStorage("gymmate_appearance") private var appearance = AppearancePreference.system.rawValue
    @AppStorage("gymmate_profile_sex") private var sexRaw = ""
    @AppStorage("gymmate_profile_birthday") private var birthdayTS = 0.0

    private var birthdayBinding: Binding<Date> {
        Binding(
            get: { birthdayTS > 0 ? Date(timeIntervalSince1970: birthdayTS) : (Calendar.current.date(byAdding: .year, value: -25, to: .now) ?? .now) },
            set: { birthdayTS = $0.timeIntervalSince1970 }
        )
    }

    var body: some View {
        NavigationStack {
            GymPage {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Settings").gymHeadline()
                    Text("Your profile, appearance and account.").gymNarrative()
                }.padding(.top, 8)

                accountHeader
                section("Account", footer: auth.user == nil ? "Sign in to sync workouts with the GymMate web app."
                                                           : "Your data syncs to this account and is available on any device you sign into.") {
                    if auth.user != nil {
                        row { Button("Log Out", role: .destructive) { try? auth.signOut() }.frame(maxWidth: .infinity, alignment: .leading) }
                        divider
                        row { Button("Sync now") { Task { await store.syncDown() } }.frame(maxWidth: .infinity, alignment: .leading) }
                    } else if auth.isCloudAvailable {
                        row {
                            Button("Sign in with Google") {
                                Task { do { try await auth.signInWithGoogle() } catch { signInError = error.localizedDescription } }
                            }.frame(maxWidth: .infinity, alignment: .leading)
                        }
                    } else {
                        row { Text("Cloud sync isn't configured.").foregroundStyle(.secondary) }
                    }
                }
                if let signInError { Text(signInError).font(.footnote).foregroundStyle(GymColor.critical) }

                section("About you", footer: "Date of birth and sex are used for age and calorie estimates (TDEE). Stored on this device.") {
                    row { DatePicker("Date of birth", selection: birthdayBinding, in: ...Date.now, displayedComponents: .date) }
                    divider
                    row {
                        HStack {
                            Text("Sex"); Spacer()
                            Picker("Sex", selection: $sexRaw) {
                                Text("Not set").tag("")
                                ForEach(Biometrics.Sex.allCases) { Text($0.title).tag($0.rawValue) }
                            }.labelsHidden().tint(.secondary)
                        }
                    }
                    divider
                    NavigationLink { ProfileView() } label: {
                        row { HStack { Text("Body & goals"); Spacer(); Image(systemName: "chevron.right").font(.footnote).foregroundStyle(.tertiary) } }
                    }.buttonStyle(.plain)
                }

                section("Units") {
                    row {
                        Picker("Weight", selection: $units) {
                            Text("Metric (kg)").tag("metric")
                            Text("Imperial (lb)").tag("imperial")
                        }.pickerStyle(.segmented)
                    }
                }

                section("Appearance") {
                    ForEach(Array(AppearancePreference.allCases.enumerated()), id: \.element.id) { i, pref in
                        if i > 0 { divider }
                        Button { appearance = pref.rawValue } label: {
                            row {
                                HStack(spacing: 14) {
                                    Image(systemName: icon(pref)).foregroundStyle(GymColor.accent).frame(width: 24)
                                    Text(pref.title).foregroundStyle(.primary)
                                    Spacer()
                                    if appearance == pref.rawValue { Image(systemName: "checkmark").foregroundStyle(GymColor.accent) }
                                }
                            }
                        }.buttonStyle(.plain)
                    }
                }

                section("Your data", footer: "Delete All Data permanently removes every workout, program, routine and custom exercise from this device and your account (your sign-in stays active). Delete Account removes the account itself and all synced data. There is no undo.") {
                    Button { confirmDeleteData = true } label: {
                        row { Label("Delete All Data", systemImage: "trash.fill").foregroundStyle(GymColor.critical) }
                    }.buttonStyle(.plain)
                    if auth.user != nil {
                        divider
                        Button { confirmDeleteAccount = true } label: {
                            row { Label("Delete Account", systemImage: "exclamationmark.triangle.fill").foregroundStyle(GymColor.critical) }
                        }.buttonStyle(.plain)
                    }
                }

                section("About") {
                    row {
                        Text("GymMate tracks your workouts and progress. Calorie and BMI figures are general estimates, not medical advice. Talk to your doctor before changing your training or diet.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    divider
                    Link(destination: URL(string: "https://aceface90.github.io/GymMate/")!) {
                        row { HStack { Text("Privacy Policy").foregroundStyle(.primary); Spacer(); Image(systemName: "arrow.up.right").font(.footnote).foregroundStyle(.tertiary) } }
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .disabled(busy)
            .confirmationDialog("Delete all data?", isPresented: $confirmDeleteData, titleVisibility: .visible) {
                Button("Delete All Data", role: .destructive) { Task { busy = true; await store.deleteAllData(); busy = false } }
            } message: { Text("This permanently removes every workout, program, routine and custom exercise. There is no undo.") }
            .confirmationDialog("Delete your account?", isPresented: $confirmDeleteAccount, titleVisibility: .visible) {
                Button("Delete Account", role: .destructive) {
                    Task {
                        busy = true; defer { busy = false }
                        await store.deleteAllData()
                        do { try await auth.deleteAccount() } catch { signInError = error.localizedDescription }
                    }
                }
            } message: { Text("This removes your account and all synced data. There is no undo.") }
        }
        .tint(GymColor.accent)
    }

    // MARK: - Pieces

    @ViewBuilder private var accountHeader: some View {
        if let u = auth.user {
            GymCard {
                HStack(spacing: 14) {
                    AsyncImage(url: u.photoURL) { $0.resizable().scaledToFill() } placeholder: {
                        Image(systemName: "person.crop.circle.fill").resizable().foregroundStyle(.tertiary)
                    }
                    .frame(width: 56, height: 56).clipShape(Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(u.displayName ?? "Signed in").font(.title3.weight(.bold))
                        if let e = u.email { Text(e).font(.subheadline).foregroundStyle(.secondary) }
                    }
                }
            }
        }
    }

    private func icon(_ p: AppearancePreference) -> String {
        switch p { case .system: "iphone"; case .light: "sun.max"; case .dark: "moon.fill" }
    }

    private var divider: some View { Divider().padding(.leading, GymMetrics.cardPadding) }

    private func row<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        c().padding(.horizontal, GymMetrics.cardPadding).padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
    }

    private func section<C: View>(_ title: String, footer: String? = nil, @ViewBuilder _ c: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased()).font(.footnote).foregroundStyle(.secondary).padding(.leading, 6)
            VStack(spacing: 0) { c() }
                .background(GymColor.card, in: .rect(cornerRadius: GymMetrics.cardRadius, style: .continuous))
            if let footer { Text(footer).font(.footnote).foregroundStyle(.secondary).padding(.horizontal, 6) }
        }
    }
}
