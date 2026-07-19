import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultReminderPreferences,
  loadReminderPreferences,
  saveReminderPreferences,
} from "@/lib/reminder-preferences";

describe("reminder preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns default preferences when none are stored", () => {
    expect(loadReminderPreferences("guest")).toEqual(getDefaultReminderPreferences());
  });

  it("saves and restores preferences", () => {
    saveReminderPreferences("guest", {
      enabled: true,
      time: "07:30",
      channel: "email",
    });

    expect(loadReminderPreferences("guest")).toEqual({
      enabled: true,
      time: "07:30",
      channel: "email",
    });
  });

  it("round-trips the calendar channel", () => {
    saveReminderPreferences("guest", {
      enabled: true,
      time: "08:15",
      channel: "calendar",
    });

    expect(loadReminderPreferences("guest")).toEqual({
      enabled: true,
      time: "08:15",
      channel: "calendar",
    });
  });

  it("normalizes invalid stored values", () => {
    window.localStorage.setItem(
      "calm-daily-coach:reminder-prefs:guest",
      JSON.stringify({ enabled: "y", time: "99:99", channel: "invalid" }),
    );

    expect(loadReminderPreferences("guest")).toEqual({
      enabled: true,
      time: "18:00",
      channel: "browser",
    });
  });
});
