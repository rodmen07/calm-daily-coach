import { beforeEach, describe, expect, it } from "vitest";
import {
  addFocusSession,
  listFocusSessions,
  summarizeFocusSessions,
  type FocusSession,
} from "@/lib/focus-session";
import { FOCUS_SESSION_COPY } from "@/lib/focus-session-copy";

beforeEach(() => {
  window.localStorage.clear();
});

function mk(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: overrides.id ?? "x",
    task: overrides.task ?? "write",
    plannedMinutes: overrides.plannedMinutes ?? 15,
    focusedSeconds: overrides.focusedSeconds ?? 15 * 60,
    outcome: overrides.outcome ?? "wrapped-up",
    date: overrides.date ?? new Date().toISOString().slice(0, 10),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

describe("focus-session store", () => {
  it("starts empty", () => {
    expect(listFocusSessions()).toEqual([]);
  });

  it("adds and lists a session, stamping id/date/createdAt", () => {
    const saved = addFocusSession({
      task: "draft the intro",
      plannedMinutes: 15,
      focusedSeconds: 900,
      outcome: "wrapped-up",
    });
    expect(saved.id).toBeTruthy();
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(saved.createdAt).toBeTruthy();

    const listed = listFocusSessions();
    expect(listed).toHaveLength(1);
    expect(listed[0].task).toBe("draft the intro");
  });

  it("keeps sessions isolated by scope (guest vs signed-in)", () => {
    addFocusSession({ task: "a", plannedMinutes: 5, focusedSeconds: 300, outcome: "wrapped-up" }, "guest");
    addFocusSession({ task: "b", plannedMinutes: 5, focusedSeconds: 300, outcome: "wrapped-up" }, "user-1");
    expect(listFocusSessions("guest")).toHaveLength(1);
    expect(listFocusSessions("user-1")).toHaveLength(1);
    expect(listFocusSessions("guest")[0].task).toBe("a");
  });

  it("records both close-out outcomes without treating either as a failure", () => {
    addFocusSession({ task: "a", plannedMinutes: 15, focusedSeconds: 900, outcome: "wrapped-up" });
    addFocusSession({ task: "b", plannedMinutes: 15, focusedSeconds: 120, outcome: "stopped-early" });
    const outcomes = listFocusSessions().map((s) => s.outcome);
    expect(outcomes).toEqual(["wrapped-up", "stopped-early"]);
  });

  it("survives corrupt storage without throwing", () => {
    window.localStorage.setItem("calm-daily-coach-focus-sessions:guest", "{not json");
    expect(listFocusSessions()).toEqual([]);
  });
});

describe("summarizeFocusSessions", () => {
  const now = new Date("2026-07-23T12:00:00Z");
  const today = "2026-07-23";

  it("counts today's sessions and whole minutes", () => {
    const sessions = [
      mk({ date: today, focusedSeconds: 900 }), // 15m
      mk({ date: today, focusedSeconds: 330 }), // 5m (5.5 floors to 5)
    ];
    const s = summarizeFocusSessions(sessions, now);
    expect(s.sessionsToday).toBe(2);
    expect(s.minutesToday).toBe(20);
  });

  it("counts the trailing 7 days for the weekly figures", () => {
    const sessions = [
      mk({ date: today, focusedSeconds: 600 }), // in today + week
      mk({ date: "2026-07-18", focusedSeconds: 600 }), // 5 days ago: in week
      mk({ date: "2026-07-10", focusedSeconds: 600 }), // >7 days ago: out
    ];
    const s = summarizeFocusSessions(sessions, now);
    expect(s.sessionsToday).toBe(1);
    expect(s.sessionsThisWeek).toBe(2);
    expect(s.minutesThisWeek).toBe(20);
  });

  it("is empty-safe and never negative", () => {
    expect(summarizeFocusSessions([], now)).toEqual({
      sessionsToday: 0,
      minutesToday: 0,
      sessionsThisWeek: 0,
      minutesThisWeek: 0,
    });
  });

  it("never exposes a streak, target, or completion-rate field", () => {
    const s = summarizeFocusSessions([mk({ date: today })], now) as Record<string, unknown>;
    for (const key of Object.keys(s)) {
      expect(key).not.toMatch(/streak|target|goal|rate|score/i);
    }
  });
});

describe("focus-session copy stays calm and pressure-free", () => {
  it("uses no streak, shame, or failure language", () => {
    const all = Object.values(FOCUS_SESSION_COPY).join(" ");
    expect(all).not.toMatch(/streak/i);
    expect(all).not.toMatch(/\bfail(ed|ure)?\b/i);
    expect(all).not.toMatch(/\bshould\b/i);
    expect(all).not.toMatch(/don'?t break/i);
    expect(all).not.toMatch(/\bmissed\b/i);
  });
})
