"use client";

import { useMemo } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { useCoachPlanner } from "@/app/hooks/use-coach-planner";
import type { FocusArea } from "@/lib/plan";
import { SwipeStepCard } from "@/app/components/swipe-step-card";
import { listCheckins } from "@/lib/browser-checkins";

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

  const checkinsInWindow = useMemo(() => {
    if (!weeklySummary) return [];
    const allCheckins = listCheckins(storageScope);
    const start = weeklySummary.windowStart;
    const end = weeklySummary.windowEnd;
    return allCheckins.filter((c) => c.date >= start && c.date <= end);
  }, [storageScope, weeklySummary]);

  const mostUsedDose = useMemo(() => {
    if (checkinsInWindow.length === 0) return "N/A";
    const counts: Record<string, number> = { light: 0, medium: 0, deep: 0 };
    checkinsInWindow.forEach((c) => {
      counts[c.dose] = (counts[c.dose] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? sorted[0][0] : "N/A";
  }, [checkinsInWindow]);

  const completionWindow = useMemo(() => {
    const doneCheckins = checkinsInWindow.filter((c) => c.status === "done");
    if (doneCheckins.length === 0) return "N/A";

    const windows = {
      Morning: 0,   // 5:00 - 11:59
      Afternoon: 0, // 12:00 - 16:59
      Evening: 0,   // 17:00 - 20:59
      Night: 0,     // 21:00 - 4:59
    };

    doneCheckins.forEach((c) => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const hour = d.getHours();
      if (hour >= 5 && hour < 12) {
        windows.Morning += 1;
      } else if (hour >= 12 && hour < 17) {
        windows.Afternoon += 1;
      } else if (hour >= 17 && hour < 21) {
        windows.Evening += 1;
      } else {
        windows.Night += 1;
      }
    });

    const sorted = Object.entries(windows).sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? `${sorted[0][0]} (${sorted[0][1]} complete)` : "N/A";
  }, [checkinsInWindow]);

  const patternSummary = useMemo(() => {
    if (completionPercent === 100) {
      return "Incredible discipline! You executed every single daily dose this week with zero skips. Plan details and doses matched your target energy perfectly.";
    }
    if (completionPercent >= 70) {
      return "Excellent consistency. You are building strong momentum, protecting your focus across most sessions while keeping skipped items minimal.";
    }
    if (completionPercent >= 40) {
      return "Steady progress. You are balancing execution with intentional skips when reality intervenes. Try keeping notes detailed to help adapt tomorrow's focus.";
    }
    if (completionPercent > 0) {
      return "Early momentum. Focus on setting light doses (5 minutes) until the habit of logging feels frictionless and natural.";
    }
    return "No completions yet in this window. Choose focus areas that fit your current energy limits and begin with light doses.";
  }, [completionPercent]);

  const skipReasonsList = useMemo(() => {
    return checkinsInWindow
      .filter((c) => c.status === "skipped" && c.skipReason)
      .map((c) => {
        const reasonLower = (c.skipReason || "").toLowerCase();
        let recommendation = "Simplify action steps or scale down the duration.";
        if (reasonLower.includes("switching") || reasonLower.includes("context") || reasonLower.includes("task")) {
          recommendation = "Try a 3-minute warm-up transition before starting your focus task.";
        } else if (reasonLower.includes("time") || reasonLower.includes("busy") || reasonLower.includes("schedule")) {
          recommendation = "Default to a light (5-minute) dose tomorrow to guard against crowded calendar blocks.";
        } else if (reasonLower.includes("distract") || reasonLower.includes("interrupted") || reasonLower.includes("phone")) {
          recommendation = "Enable quiet modes or use full-screen focus timers for this session.";
        } else if (reasonLower.includes("energy") || reasonLower.includes("tired") || reasonLower.includes("exhausted")) {
          recommendation = "Choose restorative focus steps or reduce the session's friction.";
        }

        return {
          date: c.date,
          focus: c.focus,
          reason: c.skipReason,
          recommendation,
        };
      });
  }, [checkinsInWindow]);

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
        <SwipeStepCard
          stepLabel="Step 3"
          title="Review and adjust"
          description="Track weekly outcomes and decide where to focus your next 5, 15, or 30 minutes."
          previousHref="/execute"
          previousLabel="Back: Execute"
          nextHref="/"
          nextLabel="Complete loop: Dashboard"
        >
          {!weeklySummary ? (
          <section className="rounded-xl border border-(--line) bg-(--field) p-4">
            <p className="text-sm text-slate-700">
              Complete at least one check-in to unlock weekly insights.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="mb-2 text-xl font-semibold">Weekly summary</h2>
            {checkinStatus.type !== "ok" ? (
              <p className="mb-3 rounded-lg border border-(--line) bg-(--field) px-3 py-2 text-sm text-slate-700">
                Close today in Execute to refresh this panel with your latest check-in.
              </p>
            ) : null}

            <div className="mb-4 rounded-xl border border-(--line) bg-(--field) p-3">
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

            <div className="grid gap-3 sm:grid-cols-3 mt-4">
              <div className="rounded-xl border border-(--line) bg-(--field) p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Top focus area</p>
                <p className="font-semibold text-slate-800">{topFocus ? (topFocus as FocusArea) : "N/A"}</p>
              </div>
              <div className="rounded-xl border border-(--line) bg-(--field) p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Most-used dose</p>
                <p className="font-semibold capitalize text-slate-800">{mostUsedDose}</p>
              </div>
              <div className="rounded-xl border border-(--line) bg-(--field) p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Peak momentum window</p>
                <p className="font-semibold text-slate-800">{completionWindow}</p>
              </div>
            </div>

            <div className="rounded-xl border border-(--line) bg-(--field) p-4 mt-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Coach insights & patterns</p>
              <p className="leading-6">{patternSummary}</p>
            </div>

            {focusBreakdown.length > 0 && (
              <div className="focus-breakdown-list mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Focus category trend breakdown
                </p>
                {focusBreakdown.map((item) => (
                  <div key={item.focusArea} className={`focus-row ${item.done > 0 ? "has-progress" : ""}`}>
                    <div className="mb-1 flex items-center justify-between gap-1.5 text-xs sm:text-sm">
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
            )}

            {skipReasonsList.length > 0 && (
              <div className="mt-5 rounded-xl border border-(--line) bg-(--field) p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2.5">
                  Analyze & scale local friction points
                </p>
                <div className="space-y-3 divide-y divide-(--line)">
                  {skipReasonsList.map((item, idx) => (
                    <div key={idx} className={`text-xs sm:text-sm ${idx !== 0 ? "pt-3 border-t border-(--line)" : ""}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{item.focus}</span>
                        <span className="text-slate-500 text-[10px] sm:text-xs">Logged {item.date}</span>
                      </div>
                      <p className="text-slate-600 italic">“{item.reason}”</p>
                      <div className="mt-2 text-xs flex items-start gap-1 text-[--accent] font-medium">
                        <span aria-hidden="true">💡</span>
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
          <div className="mt-5 rounded-xl border border-(--line) bg-(--field) p-3 text-sm text-slate-700">
            Finish this step by returning to Dashboard, then begin your next cycle from Focus.
          </div>
        </SwipeStepCard>
      </main>
    </div>
  );
}
