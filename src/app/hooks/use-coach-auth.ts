import { useEffect, useMemo, useState } from "react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { upsertUserAccount } from "@/lib/firestore-user";
import {
  authErrorMessage,
  shouldFallbackToRedirect,
} from "@/lib/firebase-auth-errors";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";

export function useCoachAuth() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const authConfigured = useMemo(() => getFirebaseAuth() !== null, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const db = getFirebaseFirestore();
          if (db) {
            await upsertUserAccount(
              db,
              result.user.uid,
              result.user.email ?? "",
              result.user.displayName ?? null
            );
          }
        }
      })
      .catch((error: unknown) => {
        setAuthMessage(authErrorMessage(error));
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        const db = getFirebaseFirestore();
        if (db) {
          try {
            await upsertUserAccount(
              db,
              user.uid,
              user.email ?? "",
              user.displayName ?? null
            );
          } catch (err) {
            console.error("Failed to upsert user account on auth state change:", err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthMessage("Google login is not configured yet.");
      return;
    }

    setAuthMessage("");
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const db = getFirebaseFirestore();
        if (db) {
          await upsertUserAccount(
            db,
            result.user.uid,
            result.user.email ?? "",
            result.user.displayName ?? null
          );
        }
      }
    } catch (error: unknown) {
      const message = authErrorMessage(error);

      if (shouldFallbackToRedirect(error)) {
        setAuthMessage(message);
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: unknown) {
          setAuthMessage(authErrorMessage(redirectError));
          return;
        }
      }

      setAuthMessage(message);
    }
  }

  async function signOutUser() {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
      setAuthMessage("");
    } catch {
      setAuthMessage("Could not sign out right now.");
    }
  }

  return {
    authUser,
    authMessage,
    authConfigured,
    signInWithGoogle,
    signOutUser,
  };
}