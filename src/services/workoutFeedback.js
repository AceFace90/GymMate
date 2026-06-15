import { collection, doc, query, where, orderBy, limit as firestoreLimit, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';

// Trainer adds feedback to a client's workout session
export async function addFeedback(trainerId, clientId, sessionId, feedbackText) {
  const feedbackId = `feedback_${trainerId}_${clientId}_${sessionId}_${Date.now()}`;
  const feedbackRef = doc(firestore, 'workout_feedback_cloud', feedbackId);

  await setDoc(feedbackRef, {
    trainerId,
    clientId,
    sessionId,
    feedbackText,
    createdAt: serverTimestamp(),
  });

  return feedbackId;
}

// Get feedback for a specific session
export async function getFeedbackForSession(sessionId, clientId) {
  const q = query(
    collection(firestore, 'workout_feedback_cloud'),
    where('sessionId', '==', sessionId),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ feedbackId: doc.id, ...doc.data() }));
}

// Get recent feedback for a client (last N comments across all workouts)
export async function getRecentFeedback(clientId, limitCount = 10) {
  const q = query(
    collection(firestore, 'workout_feedback_cloud'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ feedbackId: doc.id, ...doc.data() }));
}

// Get all feedback from a trainer to a specific client
export async function getFeedbackByTrainer(trainerId, clientId) {
  const q = query(
    collection(firestore, 'workout_feedback_cloud'),
    where('trainerId', '==', trainerId),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ feedbackId: doc.id, ...doc.data() }));
}
