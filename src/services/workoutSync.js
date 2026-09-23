import { collection, doc, query, where, orderBy, limit as firestoreLimit, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';
import * as db from './database';
import { bareUid, toLocalWallClock } from '../utils/idFormat';

// Returns the set of user IDs allowed to read a client's session docs: the
// client plus every trainer they currently have an active (accepted) connection
// with. Enforced server-side via the workout_sessions_cloud read rule.
async function getSessionViewerIds(clientId) {
  const viewers = new Set([clientId]);
  try {
    // trainer_clients.clientId is always stored in the canonical 'google-<uid>'
    // form (from user.id), while session uploads may pass the bare uid — so
    // normalize before matching, otherwise no trainers are found.
    const gid = clientId.startsWith('google-') ? clientId : `google-${clientId}`;
    const q = query(
      collection(firestore, 'trainer_clients'),
      where('clientId', '==', gid),
      where('clientStatus', '==', 'accepted'),
      where('trainerStatus', '==', 'accepted')
    );
    const snap = await getDocs(q);
    snap.forEach((d) => { const t = d.data().trainerId; if (t) viewers.add(t); });
  } catch (e) {
    console.error('[workoutSync] getSessionViewerIds failed:', e);
  }
  return [...viewers];
}

/**
 * Upload a completed workout session to the cloud for trainer viewing
 * @param {string} userId - Client's user ID
 * @param {Object} session - Session object from local database
 * @param {Array} sets - Array of set objects from local database
 */
export async function uploadWorkoutSession(userId, session, sets) {
  const clientId = bareUid(userId);
  // Deterministic id keyed by client + local session so re-uploads of the same
  // workout overwrite in place instead of creating a new doc every time (the
  // previous `${Date.now()}` suffix duplicated a session on every retry/re-save).
  const sessionId = `session_${clientId}_${session.id}`;
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

  const viewerIds = await getSessionViewerIds(clientId);

  const data = {
    // User identification
    clientId,
    viewerIds, // client + connected trainers — gates server-side read access

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
      completed: !!s.completed, // web stores boolean, native stores 1/0 — normalize both
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
  const clientId = bareUid(userId);
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', clientId),
    where('localSessionId', '==', session.id)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    // No cloud doc yet — upload fresh
    await uploadWorkoutSession(clientId, session, sets);
    return;
  }
  const startedAt = session.started_at
    ? Timestamp.fromDate(new Date(session.started_at))
    : serverTimestamp();
  const completedAt = session.completed_at
    ? Timestamp.fromDate(new Date(session.completed_at))
    : serverTimestamp();
  const viewerIds = await getSessionViewerIds(clientId);
  const data = {
    clientId,
    viewerIds, // client + connected trainers — gates server-side read access
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
      completed: !!s.completed, // web stores boolean, native stores 1/0 — normalize both
      isPR: s.is_pr === 1,
    })),
  };
  await setDoc(snapshot.docs[0].ref, data);
}

export async function deleteCloudSession(userId, localSessionId) {
  if (!userId || !localSessionId) return;

  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', '==', bareUid(userId)),
    where('localSessionId', '==', localSessionId)
  );

  const snapshot = await getDocs(q);
  const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

/**
 * Restore all workout sessions and sets from workout_sessions_cloud into
 * local SQLite. Called on sign-in when sessions are not in the blob backup.
 * Idempotent — uses INSERT OR REPLACE so safe to call multiple times.
 */
export async function restoreSessionsFromCloud(userId) {
  if (!userId) return;

  // Session docs store clientId in mixed forms (bare uid on upload,
  // 'google-<uid>' on edit), so match both to restore the full history.
  const bare = userId.startsWith('google-') ? userId.slice(7) : userId;
  const forms = [bare, `google-${bare}`];
  const q = query(
    collection(firestore, 'workout_sessions_cloud'),
    where('clientId', 'in', forms)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  // Self-heal: docs uploaded before viewerIds existed have no (or stale)
  // viewerIds, so trainers would be denied read access under the new rule.
  // The client owns these docs, so stamp the current viewer set on sign-in.
  const viewerIds = await getSessionViewerIds(userId);

  // completedAt ordering was previously done server-side; the 'in' query can't
  // combine with orderBy on a different field, so sort client-side.
  const docs = [...snapshot.docs].sort((a, b) => {
    const at = a.data().completedAt?.toMillis?.() ?? 0;
    const bt = b.data().completedAt?.toMillis?.() ?? 0;
    return bt - at;
  });

  for (const docSnap of docs) {
    const d = docSnap.data();

    // Backfill viewerIds if the doc is missing any current viewer.
    const existing = Array.isArray(d.viewerIds) ? d.viewerIds : [];
    if (viewerIds.some((v) => !existing.includes(v))) {
      try {
        await updateDoc(docSnap.ref, { viewerIds: [...new Set([...existing, ...viewerIds])] });
      } catch (e) {
        console.error('[workoutSync] viewerIds backfill failed:', e);
      }
    }

    // Write local wall-clock 'YYYY-MM-DD HH:MM:SS' to match how both DBs store
    // timestamps (native datetime('now','localtime'), web now()); a raw ISO
    // string would break string-sorting and comparisons in the local DB. P1 #9.
    const startedAt = toLocalWallClock(d.startedAt?.toDate?.());
    const completedAt = toLocalWallClock(d.completedAt?.toDate?.());

    // Restore the session row, keyed by localSessionId so re-runs are idempotent
    const sessionId = await db.restoreSession({
      id: d.localSessionId,
      program_id: d.programId ?? null,
      program_day_id: d.programDayId ?? null,
      day_name: d.dayName ?? 'Workout',
      started_at: startedAt,
      completed_at: completedAt,
      duration_seconds: d.durationSeconds ?? null,
      notes: d.notes ?? null,
    });

    // Restore set rows — resolve exercise_id by name since IDs differ per device
    const sets = d.sets || [];
    const exerciseCache = {};
    for (const s of sets) {
      if (!exerciseCache[s.exerciseName]) {
        const match = await db.getExerciseByName(s.exerciseName);
        exerciseCache[s.exerciseName] = match?.id ?? 0;
      }
      await db.restoreSet({
        session_id: sessionId,
        exercise_id: exerciseCache[s.exerciseName],
        exercise_name: s.exerciseName,
        set_number: s.setNumber,
        weight_kg: s.weightKg ?? null,
        reps: s.reps ?? null,
        rpe: s.rpe ?? null,
        completed: s.completed ? 1 : 0,
        is_pr: s.isPR ? 1 : 0,
      });
    }
  }
}
