"use client";

import { useMemo } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";
import type { FocusArea } from "@/lib/plan";
import { SwipeStepCard } from "@/app/components/swipe-step-card";

export default function ReviewPage() {
  const { authUser } = useCoachAuth();
  const storageScope = authUser?.uid ?? "guest";
  const { weeklySummary, topFocus, checkinStatus } = useCoachPlanner({
    storageScope,
    authEmail: authUser?.email,
  });

  const completionPercent = useMemo(() => {
    if (!weeklySummary || weeklySummary.total === 0) {
      return 0;
    }
    return Math.round((weeklySummary.done / weeklySummary.total) * 100);
  }, [weeklySummary]);

  const hasWeeklyProgress = completionPercent > 0;

  return (
    <div className="page-shell">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <SwipeStepCard
          stepLabel="Step 3"
          title="Review and adjust"
          description="Track weekly outcomes and decide where to focus your next 5, 15, or 30 minutes."
          previousHref="/execute"
          previousLabel="Back: Execute"
        >
          {!weeklySummary ? (
          <section className="rounded-xl border border-[var(--line)] bg-[var(--field)] p-4">
            <p className="text-sm text-slate-700">
              Complete at least one check-in to unlock weekly insights.
            </p>
          </section>
        ) : (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Weekly summary</h2>
            {checkinStatus.type !== "ok" ? (
              <p className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--field)] px-3 py-2 text-sm text-slate-700">
                Close today in Execute to refresh this panel with your latest check-in.
              </p>
            ) : null}
            <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--field)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Weekly completion trend
                </p>
                <p className={`progress-badge text-sm font-semibold ${hasWeeklyProgress ? "is-animated" : ""}`}>
                  {completionPercent}%
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
            </div>

            <div className="summary-grid grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:text-base">
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
                <p className="summary-label">Completion rate</p>
                <p className="summary-value">{completionPercent}%</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--field)] p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Top focus area</p>
              <p>{topFocus as FocusArea}</p>
            </div>
          </section>
        )}
        </SwipeStepCard>
      </main>
    </div>
  );
}
