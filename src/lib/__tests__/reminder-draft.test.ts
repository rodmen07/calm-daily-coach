import { describe, expect, it } from "vitest";
import { buildReminderMailtoHref } from "@/lib/reminder-draft";
import type { DailyPlan } from "@/lib/plan";

describe("reminder draft", () => {
  it("builds mailto href with encoded subject and body", () => {
    const plan: DailyPlan = {
      date: "2026-07-03",
      focus: "Deep Work",
      dose: "medium",
      minutes: 15,
      action: "Run one 15-minute focus block.",
      reflection: "What distracted you?",
      optionalResource: null,
      capMessage: "Done.",
    };

    const href = buildReminderMailtoHref(plan, "test@example.com");
    expect(href).toContain("mailto:test@example.com");
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
    expect(decodeURIComponent(href)).toContain("Your 15-minute Deep Work plan is ready");
    expect(decodeURIComponent(href)).toContain("Action: Run one 15-minute focus block.");
  });
});
