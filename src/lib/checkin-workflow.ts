import type { WeeklySummary } from "@/lib/browser-checkins";
import type { CheckinStoreAdapter } from "@/lib/checkin-store";
import type { DailyPlan } from "@/lib/plan";
import { getRustCheckinAdvice } from "@/lib/rust-coach-bridge";

export type CheckinSubmissionStatus = "done" | "skipped";

export type SubmitCheckinFlowInput = {
  plan: DailyPlan;
  status: CheckinSubmissionStatus;
  skipReason: string;
  storageScope: string;
  checkinStore: Pick<CheckinStoreAdapter, "addCheckin" | "getWeeklySummary">;
  getAdvice?: typeof getRustCheckinAdvice;
};

export type SubmitCheckinFlowResult =
  | { ok: false; errorMessage: string }
  | {
      ok: true;
      statusMessage: string;
      checkinAdvice: string;
      weeklySummary: WeeklySummary;
      nextSkipReason: string;
    };

function statusMessageFor(status: CheckinSubmissionStatus): string {
  return status === "done" ? "Great work. Check-in saved." : "Skip logged with context.";
}

export async function submitCheckinFlow({
  plan,
  status,
  skipReason,
  storageScope,
  checkinStore,
  getAdvice = getRustCheckinAdvice,
}: SubmitCheckinFlowInput): Promise<SubmitCheckinFlowResult> {
  const normalizedSkipReason = skipReason.trim();

  if (status === "skipped" && !normalizedSkipReason) {
    return { ok: false, errorMessage: "Add a short reason before skipping." };
  }

  try {
    await checkinStore.addCheckin(
      {
        date: plan.date,
        focus: plan.focus,
        dose: plan.dose,
        minutes: plan.minutes,
        status,
        skipReason: status === "skipped" ? normalizedSkipReason : undefined,
      },
      storageScope,
    );

    const checkinAdvice = (await getAdvice({
      mood: status === "done" ? 4 : 2,
      energy: status === "done" ? 4 : 2,
      friction: status === "skipped" ? normalizedSkipReason : undefined,
    })) ?? "";

    const weeklySummary = await checkinStore.getWeeklySummary(undefined, storageScope);

    return {
      ok: true,
      statusMessage: statusMessageFor(status),
      checkinAdvice,
      weeklySummary,
      nextSkipReason: "",
    };
  } catch {
    return { ok: false, errorMessage: "Could not save check-in." };
  }
}
