import Foundation

/// Mirrors web `src/utils/biometrics.js` (Mifflin-St Jeor TDEE, same BMI bands and activity multipliers).
nonisolated enum Biometrics {
    enum Sex: String, CaseIterable, Identifiable {
        case male, female
        var id: String { rawValue }
        var title: String { rawValue.capitalized }
    }

    enum Activity: String, CaseIterable, Identifiable {
        case sedentary, light, moderate, active, very_active
        var id: String { rawValue }
        var multiplier: Double {
            switch self { case .sedentary: 1.2; case .light: 1.375; case .moderate: 1.55; case .active: 1.725; case .very_active: 1.9 }
        }
        var title: String {
            switch self {
            case .sedentary: "Sedentary (desk job, little exercise)"
            case .light: "Light (1–2 days/week)"
            case .moderate: "Moderate (3–5 days/week)"
            case .active: "Active (6–7 days/week)"
            case .very_active: "Very Active (2× daily or physical job)"
            }
        }
    }

    enum Goal: String, CaseIterable, Identifiable {
        case fat_loss, muscle_gain, maintenance, endurance, strength
        var id: String { rawValue }
        var title: String {
            switch self {
            case .fat_loss: "Fat Loss"
            case .muscle_gain: "Muscle Gain"
            case .maintenance: "Maintenance"
            case .endurance: "Endurance"
            case .strength: "Strength & Power"
            }
        }
    }

    static func age(birthday: Date, now: Date = .now) -> Int? {
        let a = Calendar.current.dateComponents([.year], from: birthday, to: now).year ?? 0
        return a > 0 ? a : nil
    }

    static func bmi(weightKg: Double, heightCm: Double) -> Double? {
        guard weightKg > 0, heightCm > 0 else { return nil }
        let h = heightCm / 100
        return weightKg / (h * h)
    }

    static func bmiCategory(_ bmi: Double) -> String {
        switch bmi { case ..<18.5: "Underweight"; case ..<25: "Healthy"; case ..<30: "Overweight"; default: "Obese" }
    }

    static func tdee(weightKg: Double, heightCm: Double, age: Int?, sex: Sex?, activity: Activity) -> Int? {
        guard weightKg > 0, heightCm > 0, let age, let sex else { return nil }
        let base = 10 * weightKg + 6.25 * heightCm - 5 * Double(age)
        let bmr = sex == .male ? base + 5 : base - 161
        return Int((bmr * activity.multiplier).rounded())
    }
}
