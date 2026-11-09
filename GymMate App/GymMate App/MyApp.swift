import GoogleSignIn
import SwiftUI

@main struct MyApp: App {
    @State private var auth = AuthService()
    @State private var store = WorkoutStore()
    @AppStorage("gymmate_appearance") private var appearance = AppearancePreference.system.rawValue

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(auth)
                .environment(store)
                .preferredColorScheme(AppearancePreference(rawValue: appearance)?.colorScheme)
                .task {
                    auth.onUserChange = { user in
                        store.cloudUid = user?.uid
                        if user != nil { Task { await store.syncDown() } }
                    }
                    auth.start()
                }
                // Completes the Google Sign-In round trip (REVERSED_CLIENT_ID URL scheme).
                .onOpenURL { url in _ = GIDSignIn.sharedInstance.handle(url) }
        }
    }
}
