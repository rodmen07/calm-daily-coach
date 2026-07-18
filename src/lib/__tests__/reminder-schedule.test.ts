import { describe, expect, it } from "vitest";
import { msUntilNextOccurrence } from "@/lib/reminder-schedule";

describe("msUntilNextOccurrence", () => {
  it("returns the delay until a later time today", () => {
    const now = new Date(2026, 6, 18, 9, 0, 0, 0);
    expect(msUntilNextOccurrence("18:00", now)).toBe(9 * 60 * 60 * 1000);
  });

  it("rolls to tomorrow when the time has already passed today", () => {
    const now = new Date(2026, 6, 18, 19, 30, 0, 0);
    expect(msUntilNextOccurrence("18:00", now)).toBe(22.5 * 60 * 60 * 1000);
  });

  it("rolls to tomorrow when the time is exactly now", () => {
    const now = new Date(2026, 6, 18, 18, 0, 0, 0);
    expect(msUntilNextOccurrence("18:00", now)).toBe(24 * 60 * 60 * 1000);
  });

  it("returns null for malformed time strings", () => {
    const now = new Date(2026, 6, 18, 9, 0, 0, 0);
    expect(msUntilNextOccurrence("25:00", now)).toBeNull();
    expect(msUntilNextOccurrence("18:60", now)).toBeNull();
    expect(msUntilNextOccurrence("not-a-time", now)).toBeNull();
    expect(msUntilNextOccurrence("", now)).toBeNull();
  });
});
