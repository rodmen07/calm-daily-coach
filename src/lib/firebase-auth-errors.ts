import type { AuthError } from "firebase/auth";

export function getAuthErrorCode(error: unknown) {
  const authError = error as Partial<AuthError>;
  return authError?.code ?? "unknown";
}

export function shouldFallbackToRedirect(error: unknown) {
  const code = getAuthErrorCode(error);
  return code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment";
}

export function authErrorMessage(error: unknown) {
  const code = getAuthErrorCode(error);

  switch (code) {
    case "auth/unauthorized-domain":
      return "Google login is blocked for this domain. Add rodmen07.github.io in Firebase Authentication authorized domains.";
    case "auth/operation-not-allowed":
      return "Google login is disabled in Firebase. Enable Google provider in Authentication settings.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in repository secrets.";
    case "auth/popup-blocked":
      return "Popup was blocked by the browser. Retrying with redirect...";
    case "auth/operation-not-supported-in-this-environment":
      return "Popup sign-in is not supported in this environment. Retrying with redirect...";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completion.";
    case "auth/network-request-failed":
      return "Network request failed during sign-in. Check connection and retry.";
    default:
      return `Google login failed (${code}).`;
  }
}