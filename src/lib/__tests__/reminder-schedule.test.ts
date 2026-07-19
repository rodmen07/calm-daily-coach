import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { msUntilNextOccurrence, startReminderSchedule } from "@/lib/reminder-schedule";

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

describe("startReminderSchedule", () => {
  function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 18, 8, 0, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("fires at the scheduled time and not before", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);
    expect(schedule).not.toBeNull();

    vi.advanceTimersByTime(60 * 60 * 1000 - 1);
    expect(onDue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDue).toHaveBeenCalledTimes(1);

    schedule?.cancel();
  });

  it("re-arms for the following day after firing, one nudge per occurrence", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(2);

    schedule?.cancel();
  });

  it("returns null for malformed times without arming anything", () => {
    const onDue = vi.fn();
    expect(startReminderSchedule("25:00", onDue)).toBeNull();

    vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    expect(onDue).not.toHaveBeenCalled();
  });

  it("fires promptly on return when the due time slipped past in a hidden tab", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);

    setVisibility("hidden");
    // The clock jumps past 09:00 while the throttled timer never ran.
    vi.setSystemTime(new Date(2026, 6, 18, 9, 15, 0, 0));
    expect(onDue).not.toHaveBeenCalled();

    setVisibility("visible");
    expect(onDue).toHaveBeenCalledTimes(1);

    // The stale timer was cleared and the schedule re-armed for tomorrow.
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime((23 * 60 + 45) * 60 * 1000 - 2 * 60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(2);

    schedule?.cancel();
  });

  it("re-arms with a fresh delay when returning before the due time", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);

    setVisibility("hidden");
    vi.setSystemTime(new Date(2026, 6, 18, 8, 30, 0, 0));
    setVisibility("visible");
    expect(onDue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(onDue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDue).toHaveBeenCalledTimes(1);

    schedule?.cancel();
  });

  it("does not fire twice for the same occurrence when visibility flaps after firing", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(onDue).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    setVisibility("visible");
    expect(onDue).toHaveBeenCalledTimes(1);

    schedule?.cancel();
  });

  it("cancel stops both the timer and the visibility re-check", () => {
    const onDue = vi.fn();
    const schedule = startReminderSchedule("09:00", onDue);

    schedule?.cancel();

    vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    expect(onDue).not.toHaveBeenCalled();

    vi.setSystemTime(new Date(2026, 6, 20, 12, 0, 0, 0));
    setVisibility("visible");
    expect(onDue).not.toHaveBeenCalled();
  });
});
