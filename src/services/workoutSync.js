import { collection, doc, query, where, orderBy, limit as firestoreLimit, getDocs, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';

/**
 * Upload a completed workout session to the cloud for trainer viewing
 * @param {string} userId - Client's user ID
 * @param {Object} session - Session object from local database
 * @param {Array} sets - Array of set objects from local database
 */
export async function uploadWorkoutSession(userId, session, sets) {
  const sessionId = `session_${userId}_${session.id}_${Date.now()}`;
  const sessionRef = doc(firestore, 'workout_sessions_cloud', sessionId);

  console.log('[workoutSync] Starting upload:', {
    sessionId,
    userId,
    localSessionId: session.id,
    setsCount: sets.length,
  });

  // Convert date strings to Timestamps
  const startedAt = session.started_at
    ? Timestamp.fromDate(new Date(session.started_at))
    : serverTimestamp();

  const completedAt = session.completed_at
    ? Timestamp.fromDate(new Date(session.completed_at))
    : serverTimestamp();

  const data = {
    // User identification
    clientId: userId,

    // Session metadata
    localSessionId: session.id,
    programId: session.program_id || null,
    programDayId: session.program_day_id || null,
    dayName: session.day_name || 'Workout',

    // Timestamps
    startedAt,
    completedAt,
    uploadedAt: serverTimestamp(),

    // Duration and notes
    durationSeconds: session.duration_seconds || 0,
    notes: session.notes || '',

    // Summary stats (calculated from sets)
    totalSets: sets.length,
    completedSets: sets.filter(s => s.completed).length,
    prCount: sets.filter(s => s.is_pr).length,
    exercises: [...new Set(sets.map(s => s.exercise_name))], // Unique exercise names

    // Full set data
    sets: sets.map(s => ({
      exerciseId: s.exercise_id,
      exerciseName: s.exercise_name,
      setNumber: s.set_number,
      weightKg: s.weight_kg || null,
      reps: s.reps || null,
      rpe: s.rpe || null,
      completed: s.completed === 1,
      isPR: s.is_pr === 1,
    })),
  };

  console.log('[workoutSync] Uploading data:', {
    totalSets: data.totalSets,
    completedSets: data.completedSets,
    exercises: data.exercises,
  });

  await setDoc(sessionRef, data);

  console.log('[workoutSync] ✅ Upload complete! Document ID:', sessionId);

  return sessionId;
}

/**
 * Get recent workout sessions for a specific client
 * @param {string} clientId - Client's user ID
 * @param {number} limitCount - Maximum number of sessions to retrieve
 */
export async function getClientWorkouts(clientId, limitCount = 20) {
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', clientId),
    orderBy('completedAt', 'desc'),
    firestoreLimit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    sessionId: doc.id,
    ...doc.data(),
    // Convert Timestamps back to JS Dates for easier display
    startedAt: doc.data().startedAt?.toDate(),
    completedAt: doc.data().completedAt?.toDate(),
    uploadedAt: doc.data().uploadedAt?.toDate(),
  }));
}

/**
 * Get workout sessions for a client filtered by date range
 * @param {string} clientId - Client's user ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 */
export async function getClientWorkoutsInRange(clientId, startDate, endDate) {
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', clientId),
    where('completedAt', '>=', Timestamp.fromDate(startDate)),
    where('completedAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('completedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    sessionId: doc.id,
    ...doc.data(),
    startedAt: doc.data().startedAt?.toDate(),
    completedAt: doc.data().completedAt?.toDate(),
    uploadedAt: doc.data().uploadedAt?.toDate(),
  }));
}

/**
 * Get aggregate stats for a client's workout history
 * @param {string} clientId - Client's user ID
 */
export async function getClientWorkoutStats(clientId) {
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', clientId),
    orderBy('completedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map(doc => doc.data());

  if (sessions.length === 0) {
    return {
      totalWorkouts: 0,
      totalSets: 0,
      totalPRs: 0,
      avgDuration: 0,
      lastWorkout: null,
      exerciseFrequency: {},
    };
  }

  // Calculate stats
  const totalWorkouts = sessions.length;
  const totalSets = sessions.reduce((sum, s) => sum + (s.completedSets || 0), 0);
  const totalPRs = sessions.reduce((sum, s) => sum + (s.prCount || 0), 0);
  const avgDuration = Math.round(
    sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / sessions.length
  );

  // Exercise frequency
  const exerciseFrequency = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      exerciseFrequency[ex] = (exerciseFrequency[ex] || 0) + 1;
    });
  });

  return {
    totalWorkouts,
    totalSets,
    totalPRs,
    avgDuration,
    lastWorkout: sessions[0]?.completedAt?.toDate(),
    exerciseFrequency,
  };
}

/**
 * Delete cloud workout documents matching a local session ID.
 * Called when a user deletes a session locally so the trainer view stays in sync.
 */
export async function updateCloudSession(userId, session, sets) {
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', userId),
    where('localSessionId', '==', session.id)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    // No cloud doc yet — upload fresh
    await uploadWorkoutSession(userId, session, sets);
    return;
  }
  const startedAt = session.started_at
    ? Timestamp.fromDate(new Date(session.started_at))
    : serverTimestamp();
  const completedAt = session.completed_at
    ? Timestamp.fromDate(new Date(session.completed_at))
    : serverTimestamp();
  const data = {
    clientId: userId,
    localSessionId: session.id,
    programId: session.program_id || null,
    programDayId: session.program_day_id || null,
    dayName: session.day_name || 'Workout',
    startedAt,
    completedAt,
    uploadedAt: serverTimestamp(),
    durationSeconds: session.duration_seconds || 0,
    notes: session.notes || '',
    totalSets: sets.length,
    completedSets: sets.filter(s => s.completed).length,
    prCount: sets.filter(s => s.is_pr).length,
    exercises: [...new Set(sets.map(s => s.exercise_name))],
    sets: sets.map(s => ({
      exerciseId: s.exercise_id,
      exerciseName: s.exercise_name,
      setNumber: s.set_number,
      weightKg: s.weight_kg || null,
      reps: s.reps || null,
      rpe: s.rpe || null,
      completed: s.completed === 1,
      isPR: s.is_pr === 1,
    })),
  };
  await setDoc(snapshot.docs[0].ref, data);
}

export async function deleteCloudSession(userId, localSessionId) {
  if (!userId || !localSessionId) return;

  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', userId),
    where('localSessionId', '==', localSessionId)
  );

  const snapshot = await getDocs(q);
  const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}
