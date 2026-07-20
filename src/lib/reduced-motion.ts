export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// CSS handles every declarative animation and transition (see the reduced-motion
// block in globals.css), but timer-driven motion has to ask for itself. Shared
// here so the progress ring and the dashboard counters answer the question the
// same way. Guarded for SSR and for jsdom, where matchMedia does not exist.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
