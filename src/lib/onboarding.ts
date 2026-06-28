import { z } from "zod";
import { FOCUS_AREAS } from "@/lib/plan";

export const onboardingPreferencesSchema = z.object({
  defaultFocus: z.enum(FOCUS_AREAS),
  defaultDose: z.enum(["light", "medium", "deep"]),
  defaultTheme: z.enum(["light", "dark"]),
});

export type OnboardingPreferences = z.infer<typeof onboardingPreferencesSchema>;

export const ONBOARDING_STORAGE_KEY = "calm-daily-coach:onboarding";

export function getOnboardingPreferences(): OnboardingPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    const result = onboardingPreferencesSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveOnboardingPreferences(prefs: OnboardingPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(prefs));
}
