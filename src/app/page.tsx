"use client";

import { DOSE_OPTIONS, FOCUS_AREAS, type DailyDose, type FocusArea } from "@/lib/plan";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

const doseLabels: Record<DailyDose, string> = {
  light: "Light (3 min)",
  medium: "Medium (10 min)",
  deep: "Deep (20 min)",
};

export default function Home() {
  const { authUser, authMessage, authConfigured, signInWithGoogle, signOutUser } =
    useCoachAuth();
  const storageScope = authUser?.uid ?? "guest";

  const {
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
  } = useCoachPlanner({
    storageScope,
    authEmail: authUser?.email,
  });

  const flowStep = plan ? (checkinStatus.type === "ok" ? 3 : 2) : 1;
  const completionPercent = weeklySummary ? Math.round(weeklySummary.completionRate * 100) : 0;
  const weeklyMomentum =
    completionPercent >= 70
      ? "Strong week"
      : completionPercent >= 40
        ? "Steady progress"
        : "Early momentum";
  const focusBreakdown = weeklySummary
    ? Object.entries(weeklySummary.byFocus)
        .map(([focusArea, counts]) => ({
          focusArea,
          done: counts.done,
          skipped: counts.skipped,
          total: counts.done + counts.skipped,
        }))
        .filter((row) => row.total > 0)
        .sort((a, b) => b.done - a.done)
    : [];

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Calm Daily Coach</p>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span
              className={`rounded-full px-3 py-1 ${flowStep >= 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            >
              1. Define
            </span>
            <span
              className={`rounded-full px-3 py-1 ${flowStep >= 2 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            >
              2. Execute
            </span>
            <span
              className={`rounded-full px-3 py-1 ${flowStep >= 3 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            >
              3. Close
            </span>
          </div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          {!authConfigured ? (
            <p className="mb-3 text-sm text-amber-700">
              Google login is not configured yet. Add Firebase environment variables to enable it.
            </p>
          ) : null}
          {authMessage ? (
            <p className="mb-3 text-sm text-rose-700" role="alert" aria-live="assertive">
              {authMessage}
            </p>
          ) : null}
          {migrationStatus.type === "ok" ? (
            <p className="mb-3 text-sm text-emerald-700" aria-live="polite">
              {migrationStatus.message}
            </p>
          ) : null}
          {migrationStatus.type === "error" ? (
            <p className="mb-3 text-sm text-rose-700" role="alert" aria-live="assertive">
              {migrationStatus.message}
            </p>
          ) : null}
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
              <p className="label mb-2">Close today</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className="primary-button" onClick={() => void submitCheckin("done")}>
                  Mark complete
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void submitCheckin("skipped")}
                >
                  Skip today
                </button>
              </div>
              <div className="mt-3">
                <label htmlFor="skip-reason" className="label">
                  Skip reason (required only if skipping)
                </label>
                <input
                  id="skip-reason"
                  className="field"
                  value={skipReason}
                  onChange={(event) => setSkipReason(event.target.value)}
                  maxLength={180}
                  placeholder="Example: travel day and no deep focus window"
                />
              </div>
              {checkinStatus.type === "ok" ? (
                <p className="mt-2 text-sm text-emerald-700" aria-live="polite">
                  {checkinStatus.message}
                </p>
              ) : null}
              {checkinStatus.type === "error" ? (
                <p className="mt-2 text-sm text-rose-700" role="alert" aria-live="assertive">
                  {checkinStatus.message}
                </p>
              ) : null}
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
                <p className="mt-2 text-sm text-emerald-700" aria-live="polite">
                  {reminderStatus.message}
                </p>
              ) : null}
              {reminderStatus.type === "error" ? (
                <p className="mt-2 text-sm text-rose-700" role="alert" aria-live="assertive">
                  {reminderStatus.message}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {weeklySummary ? (
          <section className="panel mt-5">
            <h2 className="mb-3 text-xl font-semibold">Weekly summary</h2>
            <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--field)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Weekly completion trend
                </p>
                <p className="text-sm font-semibold text-slate-700">{weeklyMomentum}</p>
              </div>
              <div className="progress-track" role="img" aria-label={`Weekly completion ${completionPercent}%`}>
                <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {completionPercent}% completed in this 7-day window.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:text-base">
              <div className="summary-card">
                <p className="summary-label">Check-ins</p>
                <p className="summary-value">{weeklySummary.total}</p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Completed</p>
                <p className="summary-value">{weeklySummary.done}</p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Skipped</p>
                <p className="summary-value">{weeklySummary.skipped}</p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Completion</p>
                <p className="summary-value">{Math.round(weeklySummary.completionRate * 100)}%</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Window: {weeklySummary.windowStart} to {weeklySummary.windowEnd}
              {topFocus ? ` | Top focus: ${topFocus}` : ""}
            </p>
            {focusBreakdown.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Focus breakdown
                </p>
                {focusBreakdown.map((item) => (
                  <div key={item.focusArea} className="focus-row">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-slate-700">{item.focusArea}</span>
                      <span className="text-slate-600">
                        {item.done}/{item.total} complete
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round((item.done / item.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No check-ins yet this week. Generate today&apos;s plan to start your trendline.
              </p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
