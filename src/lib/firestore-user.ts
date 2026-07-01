import { doc, setDoc, getDoc, type Firestore } from "firebase/firestore";

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: string; // ISO string format for safe static JSON serialization
  subscriptionStatus: "free_trial" | "active" | "expired";
}

/**
 * Cleanly upserts standard user details in Firestore.
 */
export async function upsertUserAccount(
  db: Firestore,
  uid: string,
  email: string,
  displayName: string | null
): Promise<UserAccount> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const existing = userSnap.data();
    const updated = {
      ...existing,
      email,
      displayName,
    };
    await setDoc(userRef, updated, { merge: true });
    return {
      uid,
      email,
      displayName,
      createdAt: existing.createdAt || new Date().toISOString(),
      subscriptionStatus: existing.subscriptionStatus || "free_trial",
    };
  } else {
    const newUser: UserAccount = {
      uid,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      subscriptionStatus: "free_trial",
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
}

/**
 * Returns user account data from Firestore.
 */
export async function getUserAccount(db: Firestore, uid: string): Promise<UserAccount | null> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserAccount;
  }
  return null;
}

/**
 * Calculates remaining days in free trial.
 */
export function getTrialDaysRemaining(createdAtIsoStr: string): number {
  try {
    const createdDate = new Date(createdAtIsoStr);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  } catch {
    return 0;
  }
}
