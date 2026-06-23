import { collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';

// Generate 6-character invite code (uppercase alphanumeric)
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Trainer creates invite and stores relationship doc
export async function sendInvite(trainerId, trainerName) {
  console.log('[trainerClient] sendInvite called with:', { trainerId, trainerName });

  const inviteCode = generateInviteCode();
  const relationshipId = `${trainerId}_${inviteCode}`;

  console.log('[trainerClient] Generated code:', inviteCode, 'relationshipId:', relationshipId);

  const relationshipRef = doc(firestore, 'trainer_clients', relationshipId);

  try {
    await setDoc(relationshipRef, {
      trainerId,
      trainerName,
      clientId: null,
      clientName: null,
      trainerStatus: 'pending',
      clientStatus: 'pending',
      inviteCode,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
      acceptedAt: null,
      revokedAt: null,
    });

    console.log('[trainerClient] Invite saved to Firestore successfully');
    return { inviteCode, relationshipId };
  } catch (error) {
    console.error('[trainerClient] Failed to save invite:', error);
    throw error;
  }
}

// Client enters code and finds the relationship
export async function findInvite(inviteCode) {
  const q = query(
    collection(firestore, 'trainer_clients'),
    where('inviteCode', '==', inviteCode.toUpperCase()),
    where('clientId', '==', null) // Not yet accepted
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid or expired invite code');
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Check expiry
  if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
    throw new Error('Invite code has expired');
  }

  return { relationshipId: doc.id, ...data };
}

// Client accepts the invite
export async function acceptInvite(relationshipId, clientId, clientName) {
  console.log('[trainerClient] acceptInvite called with:', { relationshipId, clientId, clientName });

  const relationshipRef = doc(firestore, 'trainer_clients', relationshipId);

  try {
    await updateDoc(relationshipRef, {
      clientId,
      clientName,
      clientStatus: 'accepted',
      trainerStatus: 'accepted', // Auto-accept from trainer side (they created invite)
      acceptedAt: serverTimestamp(),
    });

    console.log('[trainerClient] Invite accepted successfully');
  } catch (error) {
    console.error('[trainerClient] Failed to accept invite:', error);
    throw error;
  }
}

// Get all clients for a trainer (accepted only)
export async function getMyClients(trainerId) {
  const q = query(
    collection(firestore, 'trainer_clients'),
    where('trainerId', '==', trainerId),
    where('trainerStatus', '==', 'accepted'),
    where('clientStatus', '==', 'accepted')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ relationshipId: doc.id, ...doc.data() }));
}

// Get all trainers for a client (returns array — supports multiple trainers)
export async function getMyTrainers(clientId) {
  const q = query(
    collection(firestore, 'trainer_clients'),
    where('clientId', '==', clientId),
    where('clientStatus', '==', 'accepted'),
    where('trainerStatus', '==', 'accepted')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ relationshipId: d.id, ...d.data() }));
}

// Convenience: get first trainer (backwards compat for callers that only need one)
export async function getMyTrainer(clientId) {
  const trainers = await getMyTrainers(clientId);
  return trainers[0] ?? null;
}

// Either party can revoke connection
export async function revokeConnection(relationshipId, userId) {
  const relationshipRef = doc(firestore, 'trainer_clients', relationshipId);
  const relationshipDoc = await getDoc(relationshipRef);

  if (!relationshipDoc.exists()) {
    throw new Error('Connection not found');
  }

  const data = relationshipDoc.data();

  // Determine which party is revoking
  if (data.trainerId === userId) {
    await updateDoc(relationshipRef, {
      trainerStatus: 'revoked',
      revokedAt: serverTimestamp(),
    });
  } else if (data.clientId === userId) {
    await updateDoc(relationshipRef, {
      clientStatus: 'revoked',
      revokedAt: serverTimestamp(),
    });
  } else {
    throw new Error('Unauthorized to revoke this connection');
  }

  // Clean up program assignments for this trainer-client pair
  const q = query(
    collection(firestore, 'program_assignments'),
    where('trainerId', '==', data.trainerId),
    where('clientId', '==', data.clientId)
  );
  const snapshot = await getDocs(q);
  const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

// Check if connection is still active
export async function isConnectionActive(relationshipId) {
  const relationshipRef = doc(firestore, 'trainer_clients', relationshipId);
  const relationshipDoc = await getDoc(relationshipRef);

  if (!relationshipDoc.exists()) {
    return false;
  }

  const data = relationshipDoc.data();
  return data.trainerStatus === 'accepted' && data.clientStatus === 'accepted';
}
