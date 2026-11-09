import Foundation
import HealthKit

/// Apple Health bridge. Write-only for workouts (least permission surface), plus a read of body mass.
/// Only ever saves real, user-completed workouts; never writes estimated or placeholder data.
@MainActor
final class HealthKitService {
    private let store = HKHealthStore()
    private var authorised = false
    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    func requestAuthorisation() async throws {
        guard isAvailable, !authorised else { return }
        try await store.requestAuthorization(
            toShare: [HKObjectType.workoutType()],
            read: [HKQuantityType(.bodyMass)])
        authorised = true
    }

    /// Saves a completed strength workout to Apple Health.
    func saveStrengthWorkout(start: Date, end: Date) async throws {
        guard isAvailable, end > start else { return }
        try await requestAuthorisation()
        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
        try await builder.beginCollection(at: start)
        try await builder.endCollection(at: end)
        _ = try await builder.finishWorkout()
    }

    /// Most recent body mass reading (kg) and its date.
    func latestBodyMass() async -> (kg: Double, date: Date)? {
        guard isAvailable else { return nil }
        try? await requestAuthorisation()
        let d = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(.bodyMass))],
            sortDescriptors: [SortDescriptor(\.startDate, order: .reverse)], limit: 1)
        guard let s = (try? await d.result(for: store))?.first else { return nil }
        return (s.quantity.doubleValue(for: .gramUnit(with: .kilo)), s.startDate)
    }
}
