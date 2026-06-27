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

  const hasPlan = Boolean(plan);
  const hasCheckedIn = checkinStatus.type === "ok";
  const flowStep = !hasPlan ? 1 : hasCheckedIn ? 4 : 3;
  const flowSteps = [
    { label: "1. Focus" },
    { label: "2. Plan" },
    { label: "3. Do" },
    { label: "4. Review" },
  ] as const;
  const flowNarrative = !hasPlan
    ? "Step 1 of 4: define your focus, dose, and context."
    : hasCheckedIn
      ? "Step 4 of 4: review your trend and reset for tomorrow."
      : "Step 3 of 4: complete your action sprint, then close the day.";
  const isPlanningLocked = hasPlan && !hasCheckedIn;
  const canEditPlanning = !isPlanningLocked;
  const canGeneratePlan = canGenerate && canEditPlanning;
  const canSubmitCheckin = hasPlan && !hasCheckedIn && !loading;
  const completionPercent = weeklySummary ? Math.round(weeklySummary.completionRate * 100) : 0;
  const hasWeeklyProgress = completionPercent > 0;
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
            {flowSteps.map((step, index) => {
              const stepNumber = index + 1;
              const stateClass =
                stepNumber < flowStep
                  ? "is-complete"
                  : stepNumber === flowStep
                    ? "is-active"
                    : "is-idle";
              return (
                <span key={step.label} className={`flow-chip ${stateClass}`}>
                  {step.label}
                </span>
              );
            })}
          </div>
          <p className="flow-detail mb-3 text-xs sm:text-sm">{flowNarrative}</p>
          <div className="flow-gates mb-3" aria-label="Daily workflow progress">
            {flowSteps.map((step, index) => {
              const stepNumber = index + 1;
              const stateClass =
                stepNumber < flowStep
                  ? "is-complete"
                  : stepNumber === flowStep
                    ? "is-current"
                    : "is-locked";
              return (
                <div key={`gate-${step.label}`} className={`flow-gate ${stateClass}`}>
                  <p className="flow-gate-label">{step.label}</p>
                  <p className="flow-gate-state">
                    {stepNumber < flowStep
                      ? "Complete"
                      : stepNumber === flowStep
                        ? "Current"
                        : "Locked"}
                  </p>
                </div>
              );
            })}
          </div>
          {!hasCheckedIn ? (
            <p className="flow-lock-note text-xs sm:text-sm" aria-live="polite">
              Step 4 review unlocks after you submit today&apos;s check-in.
            </p>
          ) : null}
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
            {isPlanningLocked ? (
              <p className="flow-lock-note rounded-lg border border-[var(--line)] bg-[var(--field)] px-3 py-2" aria-live="polite">
                Planning is locked until you close today. Submit a check-in to unlock the next plan.
              </p>
            ) : null}
            <div>
              <label htmlFor="focus" className="label">
                Focus area
              </label>
              <select
                id="focus"
                className="field"
                value={focus}
                disabled={!canEditPlanning}
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
              <p className="dose-hint">Pick the effort level you can complete today without overextending.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DOSE_OPTIONS.map((option) => (
                  <label key={option} className="dose-card">
                    <input
                      checked={dose === option}
                      disabled={!canEditPlanning}
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
                disabled={!canEditPlanning}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="field-meta">
                <p className="field-hint">Include constraints so your plan matches real-life context.</p>
                <p className="field-counter" aria-live="polite">{notes.length}/280</p>
              </div>
            </div>

            <button disabled={!canGeneratePlan} className="primary-button" type="submit">
              {loading ? "Generating..." : isPlanningLocked ? "Finish check-in to unlock" : "Generate today’s plan"}
            </button>
          </form>
        </section>

        {plan ? (
          <section className="panel mt-5">
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

            <div className="plan-cap mt-4">
              <p className="text-sm text-slate-700">{plan.capMessage}</p>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="label mb-2">Close today</p>
              <p className="mb-3 text-sm text-slate-600">
                Choose one outcome so your weekly trend reflects today&apos;s reality.
              </p>
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
                <label htmlFor="skip-reason" className="label">
                  Skip reason (required only if skipping)
                </label>
                <input
                  id="skip-reason"
                  className="field"
                  disabled={!canSubmitCheckin}
                  value={skipReason}
                  onChange={(event) => setSkipReason(event.target.value)}
                  maxLength={180}
                  placeholder="Example: travel day and no deep focus window"
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
                <p
                  className="status-banner mt-2 text-sm text-rose-800"
                  role="alert"
                  aria-live="assertive"
                >
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
            {!hasCheckedIn ? (
              <p className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--field)] px-3 py-2 text-sm text-slate-700">
                Today&apos;s review is waiting - close the day above to refresh this panel with your latest check-in.
              </p>
            ) : null}
            <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--field)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Weekly completion trend
                </p>
                <p className={`progress-badge text-sm font-semibold ${hasWeeklyProgress ? "is-animated" : ""}`}>
                  {weeklyMomentum}
                </p>
              </div>
              <div
                className={`progress-track ${hasWeeklyProgress ? "is-animated" : ""}`}
                role="img"
                aria-label={`Weekly completion ${completionPercent}%`}
              >
                <div
                  className={`progress-fill ${hasWeeklyProgress ? "is-animated" : ""}`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className={`progress-caption mt-2 text-xs ${hasWeeklyProgress ? "is-animated" : ""}`}>
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
                  <div key={item.focusArea} className={`focus-row ${item.done > 0 ? "has-progress" : ""}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-slate-700">{item.focusArea}</span>
                      <span className="text-slate-600">
                        {item.done}/{item.total} complete
                      </span>
                    </div>
                    <div
                      className={`progress-track ${item.done > 0 ? "is-animated" : ""}`}
                      role="img"
                      aria-label={`${item.focusArea} completion ${Math.round((item.done / item.total) * 100)}%`}
                    >
                      <div
                        className={`progress-fill ${item.done > 0 ? "is-animated" : ""}`}
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
