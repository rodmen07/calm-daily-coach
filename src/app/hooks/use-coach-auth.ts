import { useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthError,
  type User,
} from "firebase/auth";

function authErrorMessage(error: unknown) {
  const authError = error as Partial<AuthError>;
  const code = authError?.code ?? "unknown";

  switch (code) {
    case "auth/unauthorized-domain":
      return "Google login is blocked for this domain. Add rodmen07.github.io in Firebase Authentication authorized domains.";
    case "auth/operation-not-allowed":
      return "Google login is disabled in Firebase. Enable Google provider in Authentication settings.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in repository secrets.";
    case "auth/popup-blocked":
      return "Popup was blocked by the browser. Retrying with redirect...";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completion.";
    case "auth/network-request-failed":
      return "Network request failed during sign-in. Check connection and retry.";
    default:
      return `Google login failed (${code}).`;
  }
}

export function useCoachAuth() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const authConfigured = useMemo(() => getFirebaseAuth() !== null, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    getRedirectResult(auth).catch((error: unknown) => {
      setAuthMessage(authErrorMessage(error));
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
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
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const message = authErrorMessage(error);

      if ((error as Partial<AuthError>)?.code === "auth/popup-blocked") {
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