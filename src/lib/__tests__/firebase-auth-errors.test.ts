import {
  authErrorMessage,
  getAuthErrorCode,
  shouldFallbackToRedirect,
} from "@/lib/firebase-auth-errors";
import { describe, expect, it } from "vitest";

describe("firebase-auth-errors", () => {
  it("extracts auth error code safely", () => {
    expect(getAuthErrorCode({ code: "auth/popup-blocked" })).toBe("auth/popup-blocked");
    expect(getAuthErrorCode({})).toBe("unknown");
    expect(getAuthErrorCode(null)).toBe("unknown");
  });

  it("flags popup-blocked for redirect fallback", () => {
    expect(shouldFallbackToRedirect({ code: "auth/popup-blocked" })).toBe(true);
  });

  it("flags unsupported popup environment for redirect fallback", () => {
    expect(
      shouldFallbackToRedirect({ code: "auth/operation-not-supported-in-this-environment" }),
    ).toBe(true);
  });

  it("does not fallback to redirect on domain errors", () => {
    expect(shouldFallbackToRedirect({ code: "auth/unauthorized-domain" })).toBe(false);
  });

  it("returns specific authorized domain guidance", () => {
    expect(authErrorMessage({ code: "auth/unauthorized-domain" })).toContain(
      "Add rodmen07.github.io",
    );
  });

  it("returns generic message for unknown errors", () => {
    expect(authErrorMessage({ code: "auth/some-new-error" })).toBe(
      "Google login failed (auth/some-new-error).",
    );
  });
});