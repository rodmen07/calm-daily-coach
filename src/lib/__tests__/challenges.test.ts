import { afterEach, describe, expect, it } from "vitest";
import {
  MICRO_CHALLENGES,
  STORAGE_CHALLENGES_KEY,
  loadChallengeProgress,
  recordChallengeCompletion,
  ChallengeProgress,
} from "@/lib/challenges";

describe("Challenges Logic", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("rolls a complete set of micro-habits correctly", () => {
    expect(MICRO_CHALLENGES.length).toBeGreaterThan(5);
    const first = MICRO_CHALLENGES[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.description).toBeTruthy();
  });

  it("records completions with today's date and no duplicate ids", () => {
    const start: ChallengeProgress = {
      completedIds: [],
      lastCompletedDate: "2026-07-02",
    };

    const res = recordChallengeCompletion(start, "mind-001", "2026-07-03");
    expect(res.completedIds).toEqual(["mind-001"]);
    expect(res.lastCompletedDate).toBe("2026-07-03");

    const resSameDay = recordChallengeCompletion(res, "well-001", "2026-07-03");
    expect(resSameDay.completedIds).toEqual(["mind-001", "well-001"]);
    expect(resSameDay.lastCompletedDate).toBe("2026-07-03");

    const resRepeat = recordChallengeCompletion(resSameDay, "mind-001", "2026-07-03");
    expect(resRepeat.completedIds).toEqual(["mind-001", "well-001"]);
  });

  it("drops legacy streak fields when loading stored progress", () => {
    window.localStorage.setItem(
      STORAGE_CHALLENGES_KEY,
      JSON.stringify({
        completedIds: ["mind-001"],
        lastCompletedDate: "2026-07-02",
        currentStreak: 9,
        longestStreak: 12,
      }),
    );

    const loaded = loadChallengeProgress();
    expect(loaded).toEqual({
      completedIds: ["mind-001"],
      lastCompletedDate: "2026-07-02",
    });
    expect("currentStreak" in loaded).toBe(false);
  });
});
