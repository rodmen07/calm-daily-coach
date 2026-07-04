import { describe, expect, it } from "vitest";
import {
  MICRO_CHALLENGES,
  calculateStreakUpdate,
  checkAndDecayStreak,
  ChallengeProgress,
} from "@/lib/challenges";

describe("Challenges Logic", () => {
  it("rolls a complete set of micro-habits correctly", () => {
    expect(MICRO_CHALLENGES.length).toBeGreaterThan(5);
    const first = MICRO_CHALLENGES[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.description).toBeTruthy();
  });

  it("advances and retains streaks when checking off items on successive days", () => {
    const start: ChallengeProgress = {
      completedIds: [],
      lastCompletedDate: "2026-07-02",
      currentStreak: 4,
      longestStreak: 4,
    };

    // Complete a task today
    const res = calculateStreakUpdate(start, "mind-001", "2026-07-03", "2026-07-02");
    expect(res.completedIds).toEqual(["mind-001"]);
    expect(res.currentStreak).toBe(5);
    expect(res.longestStreak).toBe(5);
    expect(res.lastCompletedDate).toBe("2026-07-03");

    // Completing another task on the same day holds/maintains the exact streak
    const resSameDay = calculateStreakUpdate(res, "well-001", "2026-07-03", "2026-07-02");
    expect(resSameDay.completedIds).toEqual(["mind-001", "well-001"]);
    expect(resSameDay.currentStreak).toBe(5);
    expect(resSameDay.lastCompletedDate).toBe("2026-07-03");
  });

  it("keeps streaks alive if last completed was yesterday, resets if missed", () => {
    const alive: ChallengeProgress = {
      completedIds: ["mind-001"],
      lastCompletedDate: "2026-07-02",
      currentStreak: 3,
      longestStreak: 5,
    };

    // Stays alive if checked on today (preserves streak for rendering)
    const preserve = checkAndDecayStreak(alive, "2026-07-03", "2026-07-02");
    expect(preserve.currentStreak).toBe(3);

    const stale: ChallengeProgress = {
      completedIds: ["mind-001"],
      lastCompletedDate: "2026-06-30", // missed several days!
      currentStreak: 3,
      longestStreak: 5,
    };

    // Resets streak to 0 due to inactivity gap
    const decay = checkAndDecayStreak(stale, "2026-07-03", "2026-07-02");
    expect(decay.currentStreak).toBe(0);
  });
});
