"use client";

import Link from "next/link";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

export default function ExecutePage() {
  const { authUser } = useCoachAuth();
  const storageScope = authUser?.uid ?? "guest";
  const {
    plan,
    checkinStatus,
    submitCheckin,
    skipReason,
    setSkipReason,
    startNextDay,
  } = useCoachPlanner({
    storageScope,
    authEmail: authUser?.email,
  });

  const hasCheckedIn = checkinStatus.type === "ok";
  const canSubmitCheckin = Boolean(plan) && !hasCheckedIn;

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Step 2</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">Execute your plan</h1>
          <p className="mb-3 text-sm leading-6 text-slate-700 sm:text-base">
            Work through your action sprint, reflect, and close the day with one outcome.
          </p>
          <div className="flow-route-links text-sm">
            <Link className="secondary-button" href="/focus">Back to Focus</Link>
            <Link className="secondary-button" href="/review">Go to Review</Link>
          </div>
        </section>

        {!plan ? (
          <section className="panel">
            <p className="text-sm text-slate-700">
              No active plan yet. Start from Focus to generate your deliberate daily plan.
            </p>
            <div className="flow-route-links mt-3">
              <Link className="primary-button" href="/focus">Start in Focus</Link>
            </div>
          </section>
        ) : (
          <section className="panel">
            <h2 className="mb-4 text-xl font-semibold">Today&apos;s deliberate dose</h2>
            <div className="plan-meta-grid mb-4 text-sm sm:text-base">
              <p className="plan-pill">
                <span className="plan-pill-label">Focus</span>
                <span className="plan-pill-value">{plan.focus}</span>
              </p>
              <p className="plan-pill">
                <span className="plan-pill-label">Dose</span>
                <span className="plan-pill-value">{plan.dose}</span>
              </p>
              <p className="plan-pill">
                <span className="plan-pill-label">Time</span>
                <span className="plan-pill-value">{plan.minutes} min</span>
              </p>
            </div>

            <ol className="plan-steps text-sm leading-6 sm:text-base">
              <li className="plan-step">
                <p className="plan-step-title">1. Action sprint</p>
                <p className="plan-step-body">{plan.action}</p>
              </li>
              <li className="plan-step">
                <p className="plan-step-title">2. Reflection checkpoint</p>
                <p className="plan-step-body">{plan.reflection}</p>
              </li>
              {plan.optionalResource ? (
                <li className="plan-step">
                  <p className="plan-step-title">3. Optional extra</p>
                  <p className="plan-step-body">{plan.optionalResource}</p>
                </li>
              ) : null}
            </ol>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="label mb-2">Close today</p>
              <div className="close-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canSubmitCheckin}
                  onClick={() => void submitCheckin("done")}
                >
                  Mark complete
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!canSubmitCheckin}
                  onClick={() => void submitCheckin("skipped")}
                >
                  Skip today
                </button>
              </div>

              <div className="mt-3">
                <label htmlFor="skip-reason" className="label">Skip reason (required only if skipping)</label>
                <input
                  id="skip-reason"
                  className="field"
                  disabled={!canSubmitCheckin}
                  value={skipReason}
                  onChange={(event) => setSkipReason(event.target.value)}
                  maxLength={180}
                />
              </div>

              {checkinStatus.type === "ok" ? (
                <p
                  className={`status-banner mt-2 text-sm text-emerald-800 ${
                    checkinStatus.message.startsWith("Great work") ? "status-celebrate" : ""
                  }`}
                  aria-live="polite"
                >
                  {checkinStatus.message}
                </p>
              ) : null}

              {checkinStatus.type === "error" ? (
                <p className="status-banner mt-2 text-sm text-rose-800" role="alert" aria-live="assertive">
                  {checkinStatus.message}
                </p>
              ) : null}

              {hasCheckedIn ? (
                <div className="flow-route-links mt-3">
                  <Link className="primary-button" href="/review">Continue to Review</Link>
                  <button className="secondary-button" type="button" onClick={startNextDay}>
                    Start next day
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
