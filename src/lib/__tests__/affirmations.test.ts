import { describe, expect, it } from "vitest";
import {
  AFFIRMATIONS,
  affirmationIndexForDate,
  formatDateKey,
  getDailyAffirmation,
} from "@/lib/affirmations";

describe("affirmations", () => {
  it("keeps a calm, pressure-free copy set", () => {
    expect(AFFIRMATIONS.length).toBeGreaterThanOrEqual(16);
    for (const affirmation of AFFIRMATIONS) {
      expect(affirmation.trim().length).toBeGreaterThan(0);
      expect(affirmation).not.toMatch(/streak/i);
      expect(affirmation).not.toContain("—");
    }
  });

  it("formats date keys as yyyy-mm-dd", () => {
    expect(formatDateKey(new Date("2026-07-18T15:30:00.000Z"))).toBe("2026-07-18");
  });

  it("picks the same affirmation for the same day, deterministically", () => {
    const first = getDailyAffirmation("2026-07-18");
    const second = getDailyAffirmation("2026-07-18");
    expect(first).toBe(second);
    expect(AFFIRMATIONS).toContain(first);
  });

  it("cycles through the full list via the offset and wraps around", () => {
    const dateKey = "2026-07-18";
    const seen = new Set<string>();
    for (let offset = 0; offset < AFFIRMATIONS.length; offset += 1) {
      seen.add(getDailyAffirmation(dateKey, offset));
    }
    expect(seen.size).toBe(AFFIRMATIONS.length);
    expect(getDailyAffirmation(dateKey, AFFIRMATIONS.length)).toBe(getDailyAffirmation(dateKey, 0));
  });

  it("keeps indexes within list bounds for arbitrary dates", () => {
    for (const dateKey of ["2026-01-01", "2026-07-18", "2030-12-31"]) {
      const index = affirmationIndexForDate(dateKey);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(AFFIRMATIONS.length);
    }
  });
});
