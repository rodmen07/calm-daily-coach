import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createCheckinStore,
  type CheckinStoreAdapter,
} from "@/lib/checkin-store";
import type { AsyncStatus } from "@/lib/async-status";
import { doseToRustEffort, deriveTopFocus } from "@/lib/planner-derivations";
import {
  getInitialPlannerState,
  persistPlannerState,
} from "@/lib/planner-state";
import { buildReminderMailtoHref } from "@/lib/reminder-draft";
import {
  type WeeklySummary,
} from "@/lib/browser-checkins";
import {
  buildDailyPlan,
  type DailyPlan,
  type FocusArea,
} from "@/lib/plan";
import { getRustCheckinAdvice, getRustPlanBrief } from "@/lib/rust-coach-bridge";

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
  const [reminderStatus, setReminderStatus] = useState<AsyncStatus>({ type: "idle" });
  const [checkinStatus, setCheckinStatus] = useState<AsyncStatus>({ type: "idle" });
  const [skipReason, setSkipReason] = useState("");
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<AsyncStatus>({ type: "idle" });
  const [coachBrief, setCoachBrief] = useState<string | null>(null);
  const [checkinAdvice, setCheckinAdvice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydratePlannerState() {
      const state = getInitialPlannerState(storageScope);
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

    persistPlannerState(storageScope, {
      focus,
      dose,
      notes,
      email,
      plan,
    });
  }, [focus, dose, notes, email, plan, storageScope, stateHydrated]);

  const canGenerate = useMemo(() => !loading, [loading]);

  const topFocus = useMemo(() => deriveTopFocus(weeklySummary), [weeklySummary]);

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

    window.location.href = buildReminderMailtoHref(plan, email);
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

  function resetPlan() {
    setPlan(null);
    setCheckinStatus({ type: "idle" });
    setReminderStatus({ type: "idle" });
    setCoachBrief(null);
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
    resetPlan,
    coachBrief,
    checkinAdvice,
  };
}