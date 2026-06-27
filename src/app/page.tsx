"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";

function AnimatedCounter({
  value,
  suffix = "",
  className,
  testId,
}: {
  value: number;
  suffix?: string;
  className?: string;
  testId?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 650;
    const startTime = Date.now();

    const intervalId = window.setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easedProgress));

      if (progress >= 1) {
        window.clearInterval(intervalId);
      }
    }, 16);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [value]);

  return (
    <span className={className} data-testid={testId}>
      {displayValue}
      {suffix}
    </span>
  );
}

export default function Home() {
  const { authUser, authMessage, authConfigured, signInWithGoogle, signOutUser } =
    useCoachAuth();
  const storageScope = authUser?.uid ?? "guest";

  const {
    plan,
    checkinStatus,
    weeklySummary,
    migrationStatus,
    topFocus,
  } = useCoachPlanner({
    storageScope,
    authEmail: authUser?.email,
  });

  const hasCheckedIn = checkinStatus.type === "ok";
  const hasPlan = Boolean(plan);

  const nextCycleHref = !hasPlan ? "/focus" : hasCheckedIn ? "/review" : "/execute";
  const nextCycleLabel = !hasPlan
    ? "Start today\'s cycle"
    : hasCheckedIn
      ? "Continue to reflection"
      : "Continue active cycle";

  const completionPercent = weeklySummary ? Math.round(weeklySummary.completionRate * 100) : 0;
  const hasWeeklyProgress = completionPercent > 0;
  const weeklyMomentum =
    completionPercent >= 70
      ? "Strong week"
      : completionPercent >= 40
        ? "Steady progress"
        : "Early momentum";

  const focusBreakdown = useMemo(() => {
    if (!weeklySummary) {
      return [];
    }

    return Object.entries(weeklySummary.byFocus)
      .map(([focusArea, counts]) => ({
        focusArea,
        done: counts.done,
        skipped: counts.skipped,
        total: counts.done + counts.skipped,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.done - a.done);
  }, [weeklySummary]);

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="panel mb-5">
          <p className="eyebrow">Dashboard</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reflection loop
          </h1>
          <p className="mb-3 text-sm leading-6 text-slate-700 sm:text-base">
            This dashboard stays focused on progress metrics. The daily flow now lives in the swipe cards: Focus,
            Execute, and Review.
          </p>
          <div className="flow-route-links mb-3 text-sm">
            <Link className="primary-button" href={nextCycleHref}>
              {nextCycleLabel}
            </Link>
            <Link className="secondary-button" href="/focus">
              New cycle from Focus
            </Link>
          </div>
          <p className="flow-detail text-xs sm:text-sm">
            Dashboard - Focus - Execute - Review - Dashboard
          </p>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="mt-3 text-sm text-amber-700">
              Google login is not configured yet. Add Firebase environment variables to enable it.
            </p>
          ) : null}
          {authMessage ? (
            <p className="mt-3 text-sm text-rose-700" role="alert" aria-live="assertive">
              {authMessage}
            </p>
          ) : null}
          {migrationStatus.type === "ok" ? (
            <p className="mt-3 text-sm text-emerald-700" aria-live="polite">
              {migrationStatus.message}
            </p>
          ) : null}
          {migrationStatus.type === "error" ? (
            <p className="mt-3 text-sm text-rose-700" role="alert" aria-live="assertive">
              {migrationStatus.message}
            </p>
          ) : null}
        </section>

        {weeklySummary ? (
          <section className="panel">
            <h2 className="mb-3 text-xl font-semibold">Weekly summary</h2>
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

            <div className="summary-grid grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:text-base">
              <div className="summary-card">
                <p className="summary-label">Check-ins</p>
                <p className="summary-value">
                  <AnimatedCounter key={weeklySummary.total} value={weeklySummary.total} testId="weekly-total-count" />
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Completed</p>
                <p className="summary-value">
                  <AnimatedCounter key={weeklySummary.done} value={weeklySummary.done} testId="weekly-done-count" />
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Skipped</p>
                <p className="summary-value">
                  <AnimatedCounter
                    key={weeklySummary.skipped}
                    value={weeklySummary.skipped}
                    testId="weekly-skipped-count"
                  />
                </p>
              </div>
              <div className="summary-card">
                <p className="summary-label">Completion</p>
                <p className="summary-value">
                  <AnimatedCounter
                    key={completionPercent}
                    value={Math.round(weeklySummary.completionRate * 100)}
                    suffix="%"
                    testId="weekly-completion-percent"
                  />
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              Window: {weeklySummary.windowStart} to {weeklySummary.windowEnd}
              {topFocus ? ` | Top focus: ${topFocus}` : ""}
            </p>

            {focusBreakdown.length > 0 ? (
              <div className="focus-breakdown-list mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Focus breakdown
                </p>
                {focusBreakdown.map((item) => (
                  <div key={item.focusArea} className={`focus-row ${item.done > 0 ? "has-progress" : ""}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-slate-700">{item.focusArea}</span>
                      <span className="text-slate-600">
                        <AnimatedCounter
                          key={`${item.focusArea}-${item.done}`}
                          value={item.done}
                          testId={`focus-done-${item.focusArea}`}
                        />
                        /{item.total} complete
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
                No check-ins yet this week. Start today&apos;s cycle to build your trendline.
              </p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
