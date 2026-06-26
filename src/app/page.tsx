"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DOSE_OPTIONS, FOCUS_AREAS, type DailyDose, type DailyPlan, type FocusArea } from "@/lib/plan";

type ReminderStatus =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };

const doseLabels: Record<DailyDose, string> = {
  light: "Light (3 min)",
  medium: "Medium (10 min)",
  deep: "Deep (20 min)",
};

const STORAGE_KEY = "calm-daily-coach";

type SavedState = {
  focus: FocusArea;
  dose: DailyDose;
  notes: string;
  email: string;
  plan: DailyPlan | null;
};

function getInitialState(): SavedState {
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

  const raw = window.localStorage.getItem(STORAGE_KEY);
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
      focus: parsed.focus && FOCUS_AREAS.includes(parsed.focus) ? parsed.focus : fallback.focus,
      dose: parsed.dose && DOSE_OPTIONS.includes(parsed.dose) ? parsed.dose : fallback.dose,
      notes: typeof parsed.notes === "string" ? parsed.notes : fallback.notes,
      email: typeof parsed.email === "string" ? parsed.email : fallback.email,
      plan:
        parsed.plan?.date === new Date().toISOString().slice(0, 10) ? parsed.plan : fallback.plan,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

export default function Home() {
  const [initialState] = useState<SavedState>(() => getInitialState());
  const [focus, setFocus] = useState<FocusArea>(initialState.focus);
  const [dose, setDose] = useState<DailyDose>(initialState.dose);
  const [notes, setNotes] = useState(initialState.notes);
  const [email, setEmail] = useState(initialState.email);
  const [plan, setPlan] = useState<DailyPlan | null>(initialState.plan);
  const [loading, setLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>({ type: "idle" });

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        focus,
        dose,
        notes,
        email,
        plan,
      }),
    );
  }, [focus, dose, notes, email, plan]);

  const canGenerate = useMemo(() => !loading, [loading]);

  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setReminderStatus({ type: "idle" });

    try {
      const response = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, dose, notes }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      const payload = (await response.json()) as { plan: DailyPlan };
      setPlan(payload.plan);
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

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          focus: plan.focus,
          dose: plan.dose,
          action: plan.action,
          minutes: plan.minutes,
        }),
      });

      if (!response.ok) {
        throw new Error("Reminder request failed");
      }

      const payload = (await response.json()) as { delivery: string };
      setReminderStatus({
        type: "ok",
        message:
          payload.delivery === "smtp"
            ? "Reminder sent successfully."
            : "Reminder preview generated. Configure SMTP to send real email.",
      });
    } catch {
      setReminderStatus({ type: "error", message: "Could not send reminder." });
    }
  }

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Calm Daily Coach</p>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Grow daily. Stop on purpose.
          </h1>
          <p className="text-sm leading-6 text-slate-700 sm:text-base">
            You choose today&apos;s dose. The app delivers exactly that amount and nothing more.
          </p>
        </section>

        <section className="panel">
          <form className="space-y-4" onSubmit={generatePlan}>
            <div>
              <label htmlFor="focus" className="label">
                Focus area
              </label>
              <select
                id="focus"
                className="field"
                value={focus}
                onChange={(event) => setFocus(event.target.value as FocusArea)}
              >
                {FOCUS_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="label mb-2">Daily dose</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DOSE_OPTIONS.map((option) => (
                  <label key={option} className="dose-card">
                    <input
                      checked={dose === option}
                      onChange={() => setDose(option)}
                      type="radio"
                      name="dose"
                      value={option}
                    />
                    <span>{doseLabels[option]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="label">
                Context for today (optional)
              </label>
              <textarea
                id="notes"
                className="field min-h-22"
                maxLength={280}
                placeholder="Example: low energy today, avoid heavy tasks before noon"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <button disabled={!canGenerate} className="primary-button" type="submit">
              {loading ? "Generating..." : "Generate today’s plan"}
            </button>
          </form>
        </section>

        {plan ? (
          <section className="panel mt-5">
            <h2 className="mb-4 text-xl font-semibold">Today&apos;s deliberate dose</h2>
            <div className="space-y-3 text-sm leading-6 sm:text-base">
              <p>
                <strong>Focus:</strong> {plan.focus}
              </p>
              <p>
                <strong>Time:</strong> {plan.minutes} minutes
              </p>
              <p>
                <strong>Action:</strong> {plan.action}
              </p>
              <p>
                <strong>Reflection:</strong> {plan.reflection}
              </p>
              {plan.optionalResource ? (
                <p>
                  <strong>Optional:</strong> {plan.optionalResource}
                </p>
              ) : null}
              <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{plan.capMessage}</p>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <label htmlFor="email" className="label">
                Reminder email (optional)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="email"
                  className="field"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button type="button" className="secondary-button" onClick={sendReminder}>
                  Send reminder
                </button>
              </div>
              {reminderStatus.type === "ok" ? (
                <p className="mt-2 text-sm text-emerald-700">{reminderStatus.message}</p>
              ) : null}
              {reminderStatus.type === "error" ? (
                <p className="mt-2 text-sm text-rose-700">{reminderStatus.message}</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
