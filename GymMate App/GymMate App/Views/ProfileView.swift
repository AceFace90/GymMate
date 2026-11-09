import SwiftUI

struct ProfileView: View {
    @AppStorage(Units.key) private var units = ""
    @AppStorage("gymmate_profile_sex") private var sexRaw = ""
    @AppStorage("gymmate_profile_birthday") private var birthdayTS = 0.0   // 0 = unset
    @AppStorage("gymmate_profile_heightCm") private var heightCm = 0.0
    @AppStorage("gymmate_profile_weightKg") private var weightKg = 0.0
    @AppStorage("gymmate_profile_activity") private var activityRaw = Biometrics.Activity.moderate.rawValue
    @AppStorage("gymmate_profile_goal") private var goalRaw = Biometrics.Goal.maintenance.rawValue

    private var sex: Biometrics.Sex? { Biometrics.Sex(rawValue: sexRaw) }
    private var activity: Biometrics.Activity { Biometrics.Activity(rawValue: activityRaw) ?? .moderate }
    private var birthday: Date? { birthdayTS > 0 ? Date(timeIntervalSince1970: birthdayTS) : nil }
    private var age: Int? { birthday.flatMap { Biometrics.age(birthday: $0) } }
    private var imperial: Bool { Units.isImperial }
    private let cmPerInch = 2.54

    private var heightShown: Binding<Double> {
        Binding(
            get: { imperial ? heightCm / cmPerInch : heightCm },
            set: { heightCm = imperial ? $0 * cmPerInch : $0 }
        )
    }
    private var weightShown: Binding<Double> {
        Binding(get: { weightKg > 0 ? Units.display(weightKg) : 0 }, set: { weightKg = Units.toKg($0) })
    }
    private var birthdayBinding: Binding<Date> {
        Binding(
            get: { birthday ?? Calendar.current.date(byAdding: .year, value: -25, to: .now) ?? .now },
            set: { birthdayTS = $0.timeIntervalSince1970 }
        )
    }

    var body: some View {
        Form {
            Section("About you") {
                Picker("Sex", selection: $sexRaw) {
                    Text("Not set").tag("")
                    ForEach(Biometrics.Sex.allCases) { Text($0.title).tag($0.rawValue) }
                }
                DatePicker("Birthday", selection: birthdayBinding, in: ...Date.now, displayedComponents: .date)
                if let age { LabeledContent("Age", value: "\(age)") }
                else { Text("Set your birthday to calculate age.").font(.footnote).foregroundStyle(.secondary) }
            }
            Section("Body") {
                LabeledContent(imperial ? "Height (in)" : "Height (cm)") {
                    TextField("0", value: heightShown, format: .number.precision(.fractionLength(0...1)))
                        .keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
                LabeledContent("Weight (\(Units.label))") {
                    TextField("0", value: weightShown, format: .number.precision(.fractionLength(0...1)))
                        .keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
            }
            Section("Activity & goal") {
                Picker("Activity", selection: $activityRaw) {
                    ForEach(Biometrics.Activity.allCases) { Text($0.title).tag($0.rawValue) }
                }
                Picker("Goal", selection: $goalRaw) {
                    ForEach(Biometrics.Goal.allCases) { Text($0.title).tag($0.rawValue) }
                }
            }
            Section("Estimates") {
                if let bmi = Biometrics.bmi(weightKg: weightKg, heightCm: heightCm) {
                    LabeledContent("BMI", value: String(format: "%.1f · %@", bmi, Biometrics.bmiCategory(bmi)))
                } else {
                    Text("Enter height and weight to see BMI.").font(.footnote).foregroundStyle(.secondary)
                }
                if let t = Biometrics.tdee(weightKg: weightKg, heightCm: heightCm, age: age, sex: sex, activity: activity) {
                    LabeledContent("Daily calories (TDEE)", value: "\(t) kcal")
                } else {
                    Text("Add sex, birthday, height and weight to see TDEE.").font(.footnote).foregroundStyle(.secondary)
                }
            }
            Section { Text("Stored on this device only for now. Estimates use Mifflin-St Jeor, as on web.").font(.footnote).foregroundStyle(.secondary) }
        }
        .navigationTitle("Profile").navigationBarTitleDisplayMode(.inline)
    }
}
