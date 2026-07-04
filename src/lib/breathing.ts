export type BreathPhaseName = "inhale" | "hold" | "exhale" | "rest";

export interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  /** Seconds spent inhaling. */
  inhale: number;
  /** Seconds holding the breath in after inhaling. */
  hold: number;
  /** Seconds spent exhaling. */
  exhale: number;
  /** Seconds resting with lungs empty before the next inhale. */
  rest: number;
}

export interface BreathPhase {
  name: BreathPhaseName;
  /** Total duration of this phase in seconds. */
  duration: number;
}

export interface PhaseState {
  /** The phase currently active. */
  phase: BreathPhaseName;
  /** Seconds elapsed inside the current phase. */
  elapsedInPhase: number;
  /** Whole cycles completed before the current one. */
  cyclesCompleted: number;
}

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Equal 4-4-4-4 rhythm used to steady the nervous system and sharpen focus.",
    inhale: 4,
    hold: 4,
    exhale: 4,
    rest: 4,
  },
  {
    id: "four-seven-eight",
    name: "4-7-8 Relax",
    description: "A longer exhale to calm the body quickly. Great before sleep or after stress.",
    inhale: 4,
    hold: 7,
    exhale: 8,
    rest: 0,
  },
  {
    id: "coherent",
    name: "Coherent 5-5",
    description: "Smooth five-second waves that balance heart rate and encourage steady flow.",
    inhale: 5,
    hold: 0,
    exhale: 5,
    rest: 0,
  },
  {
    id: "calm",
    name: "Calm Down",
    description: "A gentle 4-2-6 pattern with a soft hold to release tension throughout the day.",
    inhale: 4,
    hold: 2,
    exhale: 6,
    rest: 0,
  },
];

/**
 * Returns the ordered non-zero phases that make up a single breath cycle.
 * Phases with a duration of zero are skipped so pacing stays accurate.
 */
export function getPhaseSequence(pattern: BreathingPattern): BreathPhase[] {
  const phases: BreathPhase[] = [
    { name: "inhale", duration: pattern.inhale },
    { name: "hold", duration: pattern.hold },
    { name: "exhale", duration: pattern.exhale },
    { name: "rest", duration: pattern.rest },
  ];
  return phases.filter((phase) => phase.duration > 0);
}

/** Total seconds in one full cycle of the pattern. */
export function getCycleDuration(pattern: BreathingPattern): number {
  return pattern.inhale + pattern.hold + pattern.exhale + pattern.rest;
}

/**
 * Resolves which phase is active for a given elapsed time in a running session.
 * Elapsed time is clamped to zero, so negative values are treated as the start.
 */
export function getPhaseState(pattern: BreathingPattern, elapsedSeconds: number): PhaseState {
  const sequence = getPhaseSequence(pattern);
  const cycleDuration = getCycleDuration(pattern);

  if (sequence.length === 0 || cycleDuration <= 0) {
    return { phase: "rest", elapsedInPhase: 0, cyclesCompleted: 0 };
  }

  const safeElapsed = Math.max(0, elapsedSeconds);
  const cyclesCompleted = Math.floor(safeElapsed / cycleDuration);
  let offset = safeElapsed - cyclesCompleted * cycleDuration;

  for (const phase of sequence) {
    if (offset < phase.duration) {
      return {
        phase: phase.name,
        elapsedInPhase: offset,
        cyclesCompleted,
      };
    }
    offset -= phase.duration;
  }

  // Floating point drift can leave us exactly at the boundary; fall back to the
  // final phase of the cycle.
  const last = sequence[sequence.length - 1];
  return {
    phase: last.name,
    elapsedInPhase: last.duration,
    cyclesCompleted,
  };
}

/** Seconds remaining in the active phase, rounded up for a countdown display. */
export function getSecondsRemainingInPhase(
  pattern: BreathingPattern,
  elapsedSeconds: number,
): number {
  const sequence = getPhaseSequence(pattern);
  if (sequence.length === 0) {
    return 0;
  }
  const state = getPhaseState(pattern, elapsedSeconds);
  const active = sequence.find((phase) => phase.name === state.phase);
  const duration = active ? active.duration : 0;
  return Math.max(0, Math.ceil(duration - state.elapsedInPhase));
}

/** Human-friendly label for a breath phase. */
export function getPhaseLabel(phase: BreathPhaseName): string {
  switch (phase) {
    case "inhale":
      return "Breathe In";
    case "hold":
      return "Hold";
    case "exhale":
      return "Breathe Out";
    case "rest":
      return "Rest";
    default:
      return "";
  }
}

/**
 * Target scale for a visual pacer orb between 0 and 1, where 0 is fully
 * contracted (empty lungs) and 1 is fully expanded (full lungs).
 */
export function getPacerScale(pattern: BreathingPattern, elapsedSeconds: number): number {
  const state = getPhaseState(pattern, elapsedSeconds);
  const sequence = getPhaseSequence(pattern);
  const active = sequence.find((phase) => phase.name === state.phase);
  const duration = active ? active.duration : 0;
  const progress = duration > 0 ? Math.min(1, state.elapsedInPhase / duration) : 1;

  switch (state.phase) {
    case "inhale":
      return progress;
    case "hold":
      return 1;
    case "exhale":
      return 1 - progress;
    case "rest":
      return 0;
    default:
      return 0;
  }
}
