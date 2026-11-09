import SwiftUI

// Design language shared with MacroMate and LabMate: grouped-grey canvas, continuous-corner
// cards, bold editorial headlines, system font. GymMate's accent is orange (not Fitness+ lime).
// Deliberately no Activity-Ring-style progress: use bars and charts instead (App Review 5.2.5).

nonisolated enum GymColor {
    static let accent = Color(light: Color(red: 1.00, green: 0.584, blue: 0.00),   // #FF9500
                              dark: Color(red: 1.00, green: 0.624, blue: 0.04))    // #FF9F0A
    static let good = Color(red: 0.20, green: 0.78, blue: 0.35)
    static let warning = Color(red: 1.00, green: 0.80, blue: 0.00)
    static let critical = Color(red: 1.00, green: 0.23, blue: 0.19)

    static let canvas = Color(uiColor: .systemGroupedBackground)
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let track = Color(uiColor: .systemFill)
    static let narrative = Color.secondary

    /// Muscle-group colours carried over from the web theme.
    static let chest = Color(red: 0.94, green: 0.27, blue: 0.27)
    static let back = Color(red: 0.23, green: 0.51, blue: 0.96)
    static let legs = Color(red: 0.55, green: 0.36, blue: 0.96)
    static let shoulders = Color(red: 0.98, green: 0.45, blue: 0.09)
    static let arms = Color(red: 0.92, green: 0.70, blue: 0.03)
    static let core = Color(red: 0.02, green: 0.71, blue: 0.83)
    static let cardio = Color(red: 0.93, green: 0.28, blue: 0.60)
    static let mobility = Color(red: 0.66, green: 0.33, blue: 0.97)
    static let fullBody = Color(red: 0.06, green: 0.73, blue: 0.51)
}

extension Color {
    /// Colour that adapts to light/dark appearance.
    nonisolated init(light: Color, dark: Color) {
        let l = UIColor(light), d = UIColor(dark)
        self.init(uiColor: UIColor { $0.userInterfaceStyle == .dark ? d : l })
    }
}

nonisolated enum GymMetrics {
    static let cardRadius: CGFloat = 26
    static let chipRadius: CGFloat = 18
    static let pagePadding: CGFloat = 20
    static let cardPadding: CGFloat = 18
}

extension View {
    func gymHeadline() -> some View { font(.system(size: 34, weight: .bold)).foregroundStyle(.primary) }
    func gymNarrative() -> some View { font(.title3).foregroundStyle(GymColor.narrative) }
    func gymEyebrow() -> some View { font(.subheadline).foregroundStyle(.secondary) }
}

/// Time-of-day greeting; same thresholds as LabMate/MacroMate.
nonisolated enum GymGreeting {
    static func timeOfDay(hour: Int = Calendar.current.component(.hour, from: Date())) -> String {
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    static func firstName(of name: String?) -> String? {
        guard let first = name?.split(separator: " ").first, !first.isEmpty else { return nil }
        return String(first)
    }
}

/// Summary chip (LabMate's chip strip pattern): small ring/icon, grey title, bold value.
struct GymSummaryChip: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.title3).foregroundStyle(GymColor.accent)
                .frame(width: 34, height: 34)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(.subheadline).foregroundStyle(.secondary)
                Text(value).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
            }
            .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(GymColor.card, in: .rect(cornerRadius: GymMetrics.chipRadius, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

struct GymCard<Content: View>: View {
    var padding: CGFloat = GymMetrics.cardPadding
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(padding)
            .background(GymColor.card, in: .rect(cornerRadius: GymMetrics.cardRadius, style: .continuous))
    }
}

/// Slim horizontal progress bar (used instead of rings).
struct GymBar: View {
    let value: Double
    let goal: Double
    var color: Color = GymColor.accent
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(color.opacity(0.18))
                Capsule().fill(color)
                    .frame(width: geo.size.width * (goal > 0 ? min(1, max(0, value / goal)) : 0))
            }
        }
        .frame(height: height)
    }
}

/// Grouped-grey scrolling page with standard horizontal padding.
struct GymPage<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) { content }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, GymMetrics.pagePadding)
                .padding(.bottom, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(GymColor.canvas.ignoresSafeArea())
    }
}

#Preview("Components") {
    GymPage {
        Text("Today").gymHeadline()
        Text("Push day · 5 exercises").gymNarrative()
        GymCard {
            Text("Weekly volume").gymEyebrow()
            GymBar(value: 12, goal: 20)
        }
    }
}
