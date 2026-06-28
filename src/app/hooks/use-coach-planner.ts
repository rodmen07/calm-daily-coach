import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createCheckinStore,
  type CheckinStoreAdapter,
} from "@/lib/checkin-store";
import {
  type WeeklySummary,
} from "@/lib/browser-checkins";
import {
  DOSE_OPTIONS,
  FOCUS_AREAS,
  buildDailyPlan,
  type DailyDose,
  type DailyPlan,
  type FocusArea,
} from "@/lib/plan";
import { getRustCheckinAdvice, getRustPlanBrief } from "@/lib/rust-coach-bridge";

type ReminderStatus =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };

type CheckinStatus =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };

type MigrationStatus =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };

const STORAGE_KEY = "calm-daily-coach";

function scopedStorageKey(scopeKey: string) {
  return `${STORAGE_KEY}:${scopeKey}`;
}

function doseToRustEffort(dose: DailyDose): "low" | "medium" | "high" {
  if (dose === "light") {
    return "low";
  }
  if (dose === "deep") {
    return "high";
  }
  return "medium";
}

type SavedState = {
  focus: FocusArea;
  dose: DailyDose;
  notes: string;
  email: string;
  plan: DailyPlan | null;
};

function getInitialState(scopeKey: string): SavedState {
  const fallback: SavedState = {
    focus: "Deep Work",
    dose: "light",
    notes: "",
    email: "",
    plan: null,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  // If onboarding preferences exist, prefer them over the generic fallback values
  const onboardingRaw = window.localStorage.getItem("calm-daily-coach:onboarding");
  if (onboardingRaw) {
    try {
      const parsedPrefs = JSON.parse(onboardingRaw) as {
        defaultFocus?: FocusArea;
        defaultDose?: DailyDose;
      };
      if (parsedPrefs.defaultFocus && FOCUS_AREAS.includes(parsedPrefs.defaultFocus)) {
        fallback.focus = parsedPrefs.defaultFocus;
      }
      if (parsedPrefs.defaultDose && DOSE_OPTIONS.includes(parsedPrefs.defaultDose)) {
        fallback.dose = parsedPrefs.defaultDose;
      }
    } catch {
      // ignore
    }
  }

  const raw = window.localStorage.getItem(scopedStorageKey(scopeKey));
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
      plan:
        parsed.plan?.date === new Date().toISOString().slice(0, 10)
          ? parsed.plan
          : fallback.plan,
    };
  } catch {
    window.localStorage.removeItem(scopedStorageKey(scopeKey));
    return fallback;
  }
}

type UseCoachPlannerArgs = {
  storageScope: string;
  authEmail?: string | null;
};

export function useCoachPlanner({ storageScope, authEmail }: UseCoachPlannerArgs) {
  const checkinStore: CheckinStoreAdapter = useMemo(() => createCheckinStore(), []);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [focus, setFocus] = useState<FocusArea>("Deep Work");
  const [dose, setDose] = useState<DailyDose>("light");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>({ type: "idle" });
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>({ type: "idle" });
  const [skipReason, setSkipReason] = useState("");
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({ type: "idle" });
  const [coachBrief, setCoachBrief] = useState<string | null>(null);
  const [checkinAdvice, setCheckinAdvice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydratePlannerState() {
      const state = getInitialState(storageScope);
      setFocus(state.focus);
      setDose(state.dose);
      setNotes(state.notes);
      setEmail((prev) => prev || state.email || authEmail || "");
      setPlan(state.plan);
      setStateHydrated(true);

      if (storageScope !== "guest") {
        const migration = await checkinStore.migrateGuestCheckins(storageScope);
        if (migration.status === "migrated" && migration.migratedCount > 0 && active) {
          setMigrationStatus({
            type: "ok",
            message: `Migrated ${migration.migratedCount} guest check-in${migration.migratedCount === 1 ? "" : "s"} to your account.`,
          });
        } else if (migration.status === "error" && active) {
          setMigrationStatus({
            type: "error",
            message: "Could not migrate guest check-ins to your account.",
          });
        }
      }

      try {
        const summary = await checkinStore.getWeeklySummary(undefined, storageScope);
        if (active) {
          setWeeklySummary(summary);
        }
      } catch {
        if (active) {
          setWeeklySummary(null);
        }
      }
    }

    void hydratePlannerState();

    return () => {
      active = false;
    };
  }, [storageScope, authEmail, checkinStore]);

  useEffect(() => {
    if (!stateHydrated) {
      return;
    }

    window.localStorage.setItem(
      scopedStorageKey(storageScope),
      JSON.stringify({
        focus,
        dose,
        notes,
        email,
        plan,
      }),
    );
  }, [focus, dose, notes, email, plan, storageScope, stateHydrated]);

  const canGenerate = useMemo(() => !loading, [loading]);

  const topFocus = useMemo(() => {
    if (!weeklySummary) {
      return null;
    }

    const ranked = Object.entries(weeklySummary.byFocus)
      .map(([focusArea, counts]) => ({
        focus: focusArea as FocusArea,
        completed: counts.done,
      }))
      .sort((a, b) => b.completed - a.completed);

    return ranked[0]?.completed > 0 ? ranked[0].focus : null;
  }, [weeklySummary]);

  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setReminderStatus({ type: "idle" });

    try {
      const nextPlan = buildDailyPlan({ focus, dose, notes });
      setPlan(nextPlan);
      setCheckinStatus({ type: "idle" });

      const rustBrief = await getRustPlanBrief({
        priorities: [nextPlan.action, nextPlan.reflection, nextPlan.optionalResource ?? ""],
        effort: doseToRustEffort(nextPlan.dose),
        focus: `${nextPlan.focus}${notes ? ` | ${notes}` : ""}`,
      });
      setCoachBrief(rustBrief);
    } catch {
      setReminderStatus({ type: "error", message: "Could not generate today's plan." });
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder() {
    if (!plan || !email) {
      setReminderStatus({ type: "error", message: "Add an email to send reminders." });
      return;
    }

    setReminderStatus({ type: "idle" });

    const subject = encodeURIComponent(
      `Your ${plan.minutes}-minute ${plan.focus} plan is ready`,
    );
    const body = encodeURIComponent(
      [
        `Focus: ${plan.focus}`,
        `Dose: ${plan.dose}`,
        `Time: ${plan.minutes} minutes`,
        "",
        `Action: ${plan.action}`,
        `Reflection: ${plan.reflection}`,
        "",
        "You set the dose. We deliver exactly that amount.",
      ].join("\n"),
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setReminderStatus({
      type: "ok",
      message: "Opened your email app with a prefilled reminder draft.",
    });
  }

  async function submitCheckin(status: "done" | "skipped") {
    if (!plan) {
      return;
    }

    if (status === "skipped" && !skipReason.trim()) {
      setCheckinStatus({ type: "error", message: "Add a short reason before skipping." });
      return;
    }

    setCheckinStatus({ type: "idle" });

    try {
      await checkinStore.addCheckin(
        {
          date: plan.date,
          focus: plan.focus,
          dose: plan.dose,
          minutes: plan.minutes,
          status,
          skipReason: status === "skipped" ? skipReason.trim() : undefined,
        },
        storageScope,
      );

      setCheckinStatus({
        type: "ok",
        message:
          status === "done" ? "Great work. Check-in saved." : "Skip logged with context.",
      });

      const derivedMood = status === "done" ? 4 : 2;
      const derivedEnergy = status === "done" ? 4 : 2;
      const rustAdvice = await getRustCheckinAdvice({
        mood: derivedMood,
        energy: derivedEnergy,
        friction: status === "skipped" ? skipReason.trim() : undefined,
      });
      setCheckinAdvice(rustAdvice);

      setSkipReason("");
      const summary = await checkinStore.getWeeklySummary(undefined, storageScope);
      setWeeklySummary(summary);
    } catch {
      setCheckinStatus({ type: "error", message: "Could not save check-in." });
    }
  }

  function startNextDay() {
    setPlan(null);
    setCheckinStatus({ type: "idle" });
    setReminderStatus({ type: "idle" });
    setSkipReason("");
    setCoachBrief(null);
    setCheckinAdvice(null);
  }

  function updatePlan(updated: Partial<DailyPlan>) {
    if (!plan) {
      return;
    }
    setPlan({
      ...plan,
      ...updated,
    });
  }

  return {
    focus,
    setFocus,
    dose,
    setDose,
    notes,
    setNotes,
    email,
    setEmail,
    plan,
    loading,
    canGenerate,
    reminderStatus,
    sendReminder,
    checkinStatus,
    submitCheckin,
    skipReason,
    setSkipReason,
    weeklySummary,
    migrationStatus,
    topFocus,
    generatePlan,
    startNextDay,
    updatePlan,
    coachBrief,
    checkinAdvice,
  };
}