"use client";

import Link from "next/link";
import { DOSE_OPTIONS, FOCUS_AREAS, type DailyDose, type FocusArea } from "@/lib/plan";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

const doseLabels: Record<DailyDose, string> = {
  light: "Light (5 min)",
  medium: "Medium (15 min)",
  deep: "Deep (30 min)",
};

export default function FocusPage() {
  const { authUser, signInWithGoogle, signOutUser } = useCoachAuth();
  const storageScope = authUser?.uid ?? "guest";
  const {
    focus,
    setFocus,
    dose,
    setDose,
    notes,
    setNotes,
    plan,
    loading,
    canGenerate,
    checkinStatus,
    generatePlan,
  } = useCoachPlanner({
    storageScope,
    authEmail: authUser?.email,
  });

  const isPlanningLocked = Boolean(plan) && checkinStatus.type !== "ok";
  const canGeneratePlan = canGenerate && !isPlanningLocked;

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Step 1</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">Set your focus</h1>
          <p className="mb-3 text-sm leading-6 text-slate-700 sm:text-base">
            Choose the area and dose first, then generate a plan you can execute today.
          </p>
          <div className="flow-route-links mb-3 text-sm">
            <Link className="secondary-button" href="/execute">Go to Execute</Link>
            <Link className="secondary-button" href="/review">Go to Review</Link>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              {authUser ? `Signed in as ${authUser.displayName ?? authUser.email}` : "Guest mode"}
            </p>
            {authUser ? (
              <button className="secondary-button" type="button" onClick={signOutUser}>
                Sign out
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={signInWithGoogle}>
                Continue with Google
              </button>
            )}
          </div>
        </section>

        <section className="panel">
          <form className="space-y-4" onSubmit={generatePlan}>
            {isPlanningLocked ? (
              <p className="flow-lock-note rounded-lg border border-[var(--line)] bg-[var(--field)] px-3 py-2" aria-live="polite">
                Planning is locked until you close today. Complete or skip in Execute to unlock.
              </p>
            ) : null}

            <div>
              <label htmlFor="focus" className="label">Focus area</label>
              <select
                id="focus"
                className="field"
                value={focus}
                disabled={isPlanningLocked}
                onChange={(event) => setFocus(event.target.value as FocusArea)}
              >
                {FOCUS_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="label mb-2">Improvement categories</p>
              <ul className="category-grid" role="list" aria-label="Improvement categories">
                {FOCUS_AREAS.map((area) => (
                  <li key={area} className={`category-chip ${focus === area ? "is-selected" : ""}`}>
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label mb-2">Daily dose</p>
              <p className="dose-hint">Pick the effort level you can complete today without overextending.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DOSE_OPTIONS.map((option) => (
                  <label key={option} className="dose-card">
                    <input
                      checked={dose === option}
                      disabled={isPlanningLocked}
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
              <label htmlFor="notes" className="label">Context for today (optional)</label>
              <textarea
                id="notes"
                className="field min-h-22"
                maxLength={280}
                disabled={isPlanningLocked}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="field-meta">
                <p className="field-hint">Include constraints so your plan matches real-life context.</p>
                <p className="field-counter" aria-live="polite">{notes.length}/280</p>
              </div>
            </div>

            <button disabled={!canGeneratePlan} className="primary-button" type="submit">
              {loading ? "Generating..." : isPlanningLocked ? "Finish check-in to unlock" : "Generate plan"}
            </button>
          </form>
        </section>

        {plan ? (
          <section className="panel mt-5">
            <h2 className="mb-2 text-xl font-semibold">Plan ready</h2>
            <p className="text-sm text-slate-700">
              Your {plan.minutes}-minute {plan.focus} plan is ready. Continue to Execute to close the day.
            </p>
            <div className="flow-route-links mt-3">
              <Link className="primary-button" href="/execute">Continue to Execute</Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
