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
  type CheckedInRecord,
} from "@/lib/planner-state";
import { buildReminderMailtoHref } from "@/lib/reminder-draft";
import { hydratePlannerSession } from "@/lib/planner-session";
import {
  type WeeklySummary,
} from "@/lib/browser-checkins";
import {
  buildDailyPlan,
  type DailyDose,
  type DailyPlan,
  type FocusArea,
} from "@/lib/plan";
import { getRustCheckinAdvice, getRustPlanBrief } from "@/lib/rust-coach-bridge";
import { statusMessageFor, submitCheckinFlow } from "@/lib/checkin-workflow";

type UseCoachPlannerArgs = {
  storageScope: string;
  authEmail?: string | null;
};

export function useCoachPlanner({ storageScope, authEmail }: UseCoachPlannerArgs) {
  // Every page passes storageScope = authUser?.uid ?? "guest", so a non-guest
  // scope means a signed-in user. The store is re-created on sign-in/sign-out
  // so the unset-env default can resolve to Firestore for signed-in users.
  const signedIn = storageScope !== "guest";
  const checkinStore: CheckinStoreAdapter = useMemo(
    () => createCheckinStore(undefined, { signedIn }),
    [signedIn],
  );
  const [stateHydrated, setStateHydrated] = useState(false);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusArea>("Deep Work");
  const [dose, setDose] = useState<DailyDose>("light");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<AsyncStatus>({ type: "idle" });
  const [checkinStatus, setCheckinStatus] = useState<AsyncStatus>({ type: "idle" });
  // Mirrors checkinStatus but is the persisted half: checkinStatus itself is
  // transient async UI state (rebuilt fresh every mount), while checkedIn is
  // what gets round-tripped through localStorage so a reload can rebuild
  // checkinStatus instead of always starting at idle (see planner-state.ts).
  const [checkedIn, setCheckedIn] = useState<CheckedInRecord | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<AsyncStatus>({ type: "idle" });
  const [coachBrief, setCoachBrief] = useState<string | null>(null);
  const [checkinAdvice, setCheckinAdvice] = useState<string | null>(null);

  // Synchronously reset stateHydrated if the storage scope changes in render phase.
  // This prevents the old scope's state from clobbering the new scope's localStorage on auth transitions.
  const [lastScope, setLastScope] = useState(storageScope);
  if (storageScope !== lastScope) {
    setLastScope(storageScope);
    setStateHydrated(false);
  }

  useEffect(() => {
    let active = true;

    async function hydratePlannerState() {
      const state = getInitialPlannerState(storageScope);
      const session = await hydratePlannerSession({
        initialState: state,
        authEmail,
        storageScope,
        checkinStore,
      });

      if (!active) {
        return;
      }

      setFocus(session.nextState.focus);
      setDose(session.nextState.dose);
      setNotes(session.nextState.notes);
      setEmail((prev) => prev || session.nextState.email);
      setPlan(session.nextState.plan);
      setMigrationStatus(session.migrationStatus);
      setWeeklySummary(session.weeklySummary);
      setCheckedIn(session.nextState.checkedIn);
      setCheckinStatus(
        session.nextState.checkedIn
          ? { type: "ok", message: statusMessageFor(session.nextState.checkedIn.status) }
          : { type: "idle" },
      );
      setLoadedScope(storageScope);
      setStateHydrated(true);
    }

    void hydratePlannerState();

    return () => {
      active = false;
    };
  }, [storageScope, authEmail, checkinStore]);

  useEffect(() => {
    // Only persist of the state is fully hydrated AND the currently loaded scope matches the storage scope.
    if (!stateHydrated || storageScope !== loadedScope) {
      return;
    }

    persistPlannerState(storageScope, {
      focus,
      dose,
      notes,
      email,
      plan,
      checkedIn,
    });
  }, [focus, dose, notes, email, plan, checkedIn, storageScope, stateHydrated, loadedScope]);

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
      setCheckedIn(null);

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

    setCheckinStatus({ type: "idle" });

    const result = await submitCheckinFlow({
      plan,
      status,
      skipReason,
      storageScope,
      checkinStore,
      getAdvice: getRustCheckinAdvice,
    });

    if (!result.ok) {
      setCheckinStatus({ type: "error", message: result.errorMessage });
      return;
    }

    setCheckinStatus({ type: "ok", message: result.statusMessage });
    setCheckedIn({ date: plan.date, status });
    setCheckinAdvice(result.checkinAdvice);
    setSkipReason(result.nextSkipReason);
    setWeeklySummary(result.weeklySummary);
  }

  function startNextDay() {
    setPlan(null);
    setCheckinStatus({ type: "idle" });
    setCheckedIn(null);
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
    setCheckedIn(null);
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