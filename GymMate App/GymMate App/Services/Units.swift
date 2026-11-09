import SwiftUI

/// Weight is always stored in kg; this converts for display and input only (same as the web app).
nonisolated enum Units {
    static let key = "gymmate_units"
    static let kgPerLb = 0.45359237

    static var isImperial: Bool {
        if let saved = UserDefaults.standard.string(forKey: key) { return saved == "imperial" }
        return Locale.current.measurementSystem == .us
    }
    static var label: String { isImperial ? "lb" : "kg" }
    static func display(_ kg: Double) -> Double { isImperial ? kg / kgPerLb : kg }
    static func toKg(_ shown: Double) -> Double { isImperial ? shown * kgPerLb : shown }
    static func text(_ kg: Double) -> String {
        let v = display(kg)
        return (v.rounded() == v ? String(Int(v)) : String(format: "%.1f", v)) + " " + label
    }
}

enum AppearancePreference: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var colorScheme: ColorScheme? {
        switch self { case .system: nil; case .light: .light; case .dark: .dark }
    }
}
