import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';

export const db = getFirestore(app);

export type UserDoc = {
  uid: string;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export const userDocRef = (uid: string) => doc(db, 'user', uid);

/**
 * Upsert user data at user/{uid}.
 * - Sets createdAt on first write
 * - Always updates updatedAt
 */
export async function saveUser(
  uid: string,
  data: Partial<UserDoc>
): Promise<void> {
  const ref = userDocRef(uid);
  const now = serverTimestamp();
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        uid,
        ...data,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } else {
    await setDoc(
      ref,
      {
        ...data,
        updatedAt: now,
      },
      { merge: true }
    );
  }
}

/**
 * Read user data from user/{uid}.
 * Returns null if not found.
 */
export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UserDoc;
  return { ...data, uid };
}
