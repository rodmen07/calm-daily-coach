import { DOSE_OPTIONS, FOCUS_AREAS, type DailyDose, type DailyPlan, type FocusArea } from "@/lib/plan";

const STORAGE_KEY = "calm-daily-coach";
const ONBOARDING_STORAGE_KEY = "calm-daily-coach:onboarding";

export type SavedPlannerState = {
  focus: FocusArea;
  dose: DailyDose;
  notes: string;
  email: string;
  plan: DailyPlan | null;
};

export function scopedPlannerStorageKey(scopeKey: string): string {
  return `${STORAGE_KEY}:${scopeKey}`;
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function plannerFallbackState(): SavedPlannerState {
  return {
    focus: "Deep Work",
    dose: "light",
    notes: "",
    email: "",
    plan: null,
  };
}

function applyOnboardingDefaults(state: SavedPlannerState): SavedPlannerState {
  if (typeof window === "undefined") {
    return state;
  }

  const onboardingRaw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!onboardingRaw) {
    return state;
  }

  try {
    const parsedPrefs = JSON.parse(onboardingRaw) as {
      defaultFocus?: FocusArea;
      defaultDose?: DailyDose;
    };

    return {
      ...state,
      focus:
        parsedPrefs.defaultFocus && FOCUS_AREAS.includes(parsedPrefs.defaultFocus)
          ? parsedPrefs.defaultFocus
          : state.focus,
      dose:
        parsedPrefs.defaultDose && DOSE_OPTIONS.includes(parsedPrefs.defaultDose)
          ? parsedPrefs.defaultDose
          : state.dose,
    };
  } catch {
    return state;
  }
}

export function getInitialPlannerState(scopeKey: string): SavedPlannerState {
  const fallback = applyOnboardingDefaults(plannerFallbackState());

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(scopedPlannerStorageKey(scopeKey));
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as {
      focus?: FocusArea;
      dose?: DailyDose;
      notes?: string;
      email?: string;
      plan?: DailyPlan;
    };

    return {
      focus:
        parsed.focus && FOCUS_AREAS.includes(parsed.focus)
          ? parsed.focus
          : fallback.focus,
      dose:
        parsed.dose && DOSE_OPTIONS.includes(parsed.dose)
          ? parsed.dose
          : fallback.dose,
      notes: typeof parsed.notes === "string" ? parsed.notes : fallback.notes,
      email: typeof parsed.email === "string" ? parsed.email : fallback.email,
      plan: parsed.plan?.date === todayDateKey() ? parsed.plan : fallback.plan,
    };
  } catch {
    window.localStorage.removeItem(scopedPlannerStorageKey(scopeKey));
    return fallback;
  }
}

export function persistPlannerState(scopeKey: string, state: SavedPlannerState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(scopedPlannerStorageKey(scopeKey), JSON.stringify(state));
}
