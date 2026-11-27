import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { CoLearningNudge, FriendEdge, LearnerProfile, Technique, UserProgress } from '../types';

function generateFriendCode(uid: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const seed = uid.charCodeAt(i % uid.length) + Math.floor(Math.random() * chars.length);
    suffix += chars[seed % chars.length];
  }
  return `SIHIR-${suffix}`;
}

function sanitizeStr(val: string, fallback: string, maxLen: number): string {
  const trimmed = (val || fallback).trim();
  return (trimmed || fallback).slice(0, maxLen);
}

export async function ensureUserProfiles(
  user: User,
  localProgress: UserProgress,
  activeTechnique: Technique
): Promise<LearnerProfile> {
  const uid = user.uid;
  const displayName = sanitizeStr(user.displayName || user.email?.split('@')[0] || 'Sihirbaz', 'Sihirbaz', 50);

  // 1. Private PII info
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  try {
    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists()) {
      await setDoc(privateRef, {
        uid,
        email: sanitizeStr(user.email || 'user@example.com', 'user@example.com', 256),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
  }

  // 2. Public-safe Learner profile
  const learnerRef = doc(db, 'learners', uid);
  try {
    const learnerSnap = await getDoc(learnerRef);
    if (learnerSnap.exists()) {
      return learnerSnap.data() as LearnerProfile;
    }

    const friendCode = generateFriendCode(uid);
    const initialProfile: Record<string, unknown> = {
      uid,
      displayName,
      friendCode,
      currentTechnique: sanitizeStr(activeTechnique.name, 'Double Lift', 80),
      currentTechniqueTitle: sanitizeStr(activeTechnique.title, 'Double Lift Nasıl Yapılır?', 120),
      xp: Math.max(0, Math.min(10000000, Math.floor(localProgress.xp))),
      streakDays: Math.max(0, Math.min(36500, Math.floor(localProgress.streakDays))),
      completedReps: Math.max(0, Math.min(1000000, Math.floor(localProgress.completedReps))),
      photoChecks: Math.max(0, Math.min(1000000, Math.floor(localProgress.photoChecks))),
      lastPracticeDate: sanitizeStr(localProgress.lastPracticeDate, '', 20),
      unlockedBadgeIds: localProgress.unlockedBadgeIds.slice(0, 20),
      practicedTechniques: localProgress.practicedTechniques.slice(0, 30),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(learnerRef, initialProfile);

    // 3. Register exact-lookup friendCode index
    const codeRef = doc(db, 'friendCodes', friendCode);
    await setDoc(codeRef, {
      uid,
      ownerId: uid,
      displayName,
      createdAt: serverTimestamp(),
    });

    return {
      uid,
      displayName,
      friendCode,
      currentTechnique: initialProfile.currentTechnique as string,
      currentTechniqueTitle: initialProfile.currentTechniqueTitle as string,
      xp: initialProfile.xp as number,
      streakDays: initialProfile.streakDays as number,
      completedReps: initialProfile.completedReps as number,
      photoChecks: initialProfile.photoChecks as number,
      lastPracticeDate: initialProfile.lastPracticeDate as string,
      unlockedBadgeIds: initialProfile.unlockedBadgeIds as string[],
      practicedTechniques: initialProfile.practicedTechniques as string[],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `learners/${uid}`);
  }
}

export async function syncLearnerProgress(
  uid: string,
  displayName: string,
  progress: UserProgress,
  activeTechnique: Technique
): Promise<void> {
  const learnerRef = doc(db, 'learners', uid);
  try {
    await updateDoc(learnerRef, {
      displayName: sanitizeStr(displayName, 'Sihirbaz', 50),
      currentTechnique: sanitizeStr(activeTechnique.name, 'Double Lift', 80),
      currentTechniqueTitle: sanitizeStr(activeTechnique.title, 'Double Lift Nasıl Yapılır?', 120),
      xp: Math.max(0, Math.min(10000000, Math.floor(progress.xp))),
      streakDays: Math.max(0, Math.min(36500, Math.floor(progress.streakDays))),
      completedReps: Math.max(0, Math.min(1000000, Math.floor(progress.completedReps))),
      photoChecks: Math.max(0, Math.min(1000000, Math.floor(progress.photoChecks))),
      lastPracticeDate: sanitizeStr(progress.lastPracticeDate, '', 20),
      unlockedBadgeIds: progress.unlockedBadgeIds.slice(0, 20),
      practicedTechniques: progress.practicedTechniques.slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `learners/${uid}`);
  }
}

export async function addFriendByCode(
  currentUid: string,
  rawCode: string
): Promise<{ displayName: string; friendUid: string }> {
  const normalizedCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!normalizedCode || normalizedCode.length < 4 || normalizedCode.length > 16) {
    throw new Error('Geçerli bir arkadaş kodu girin (ör. SIHIR-7K2M).');
  }

  let codeData: { uid: string; displayName: string } | null = null;
  try {
    const codeSnap = await getDoc(doc(db, 'friendCodes', normalizedCode));
    if (!codeSnap.exists()) {
      throw new Error('Bu arkadaş koduna sahip bir kullanıcı bulunamadı.');
    }
    codeData = codeSnap.data() as { uid: string; displayName: string };
  } catch (err) {
    if (err instanceof Error && err.message.includes('bulunamadı')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, `friendCodes/${normalizedCode}`);
  }

  if (codeData.uid === currentUid) {
    throw new Error('Kendi arkadaş kodunuzu ekleyemezsiniz.');
  }

  const friendRef = doc(db, 'users', currentUid, 'friends', codeData.uid);
  try {
    await setDoc(friendRef, {
      ownerId: currentUid,
      friendUid: codeData.uid,
      displayName: sanitizeStr(codeData.displayName, 'Sihirbaz Arkadaş', 50),
      friendCode: normalizedCode,
      addedAt: serverTimestamp(),
    });
    return { displayName: codeData.displayName, friendUid: codeData.uid };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${currentUid}/friends/${codeData.uid}`);
  }
}

export async function removeFriend(currentUid: string, friendUid: string): Promise<void> {
  const path = `users/${currentUid}/friends/${friendUid}`;
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'friends', friendUid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendCoLearningNudge(
  fromUid: string,
  fromName: string,
  toUid: string,
  techniqueName: string,
  message: string
): Promise<void> {
  const nudgeId = `nudge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `learners/${toUid}/nudges/${nudgeId}`;
  try {
    await setDoc(doc(db, 'learners', toUid, 'nudges', nudgeId), {
      fromUid,
      toUid,
      fromName: sanitizeStr(fromName, 'Arkadaşın', 50),
      techniqueName: sanitizeStr(techniqueName, 'Double Lift', 80),
      message: sanitizeStr(message, 'Birlikte pratik yapalım!', 160),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function dismissNudge(uid: string, nudgeId: string): Promise<void> {
  const path = `learners/${uid}/nudges/${nudgeId}`;
  try {
    await deleteDoc(doc(db, 'learners', uid, 'nudges', nudgeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeFriendsList(
  uid: string,
  onChange: (friends: FriendEdge[]) => void
): Unsubscribe {
  const path = `users/${uid}/friends`;
  const q = query(collection(db, 'users', uid, 'friends'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendEdge[] = [];
      snapshot.forEach((d) => list.push(d.data() as FriendEdge));
      onChange(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeFriendProfile(
  friendUid: string,
  onChange: (profile: LearnerProfile | null) => void
): Unsubscribe {
  const path = `learners/${friendUid}`;
  return onSnapshot(
    doc(db, 'learners', friendUid),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as LearnerProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeIncomingNudges(
  uid: string,
  onChange: (nudges: CoLearningNudge[]) => void
): Unsubscribe {
  const path = `learners/${uid}/nudges`;
  const q = query(collection(db, 'learners', uid, 'nudges'), where('toUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CoLearningNudge[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<CoLearningNudge, 'id'>) });
      });
      onChange(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
