import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReminderSettingsPanel } from "@/app/components/reminder-settings";
import type { AsyncStatus } from "@/lib/async-status";

const PREFS_KEY = "calm-daily-coach:reminder-prefs:guest";

function renderPanel(overrides?: {
  draftStatus?: AsyncStatus;
  canSendDraft?: boolean;
  onSendEmailDraft?: () => void;
  onEmailChange?: (value: string) => void;
  email?: string;
}) {
  return render(
    <ReminderSettingsPanel
      storageScope="guest"
      email={overrides?.email ?? ""}
      onEmailChange={overrides?.onEmailChange ?? (() => {})}
      onSendEmailDraft={overrides?.onSendEmailDraft ?? (() => {})}
      draftStatus={overrides?.draftStatus ?? { type: "idle" }}
      canSendDraft={overrides?.canSendDraft ?? false}
    />,
  );
}

describe("ReminderSettingsPanel", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("renders reminders off by default with honest no-auto-send copy", () => {
    renderPanel();

    expect(screen.getByText("Reminders")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
    const toggle = screen.getByRole("checkbox", { name: "Enable a daily reminder" }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(
      screen.getByText(
        "Focus never sends anything automatically. Browser nudges appear only while the app is open, and email reminders open a prefilled draft in your mail app.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Reminder time")).toBeNull();
  });

  it("persists enabling the reminder and choosing a time", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable a daily reminder" }));

    expect(screen.getByText("Daily at 18:00")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}")).toMatchObject({
      enabled: true,
      time: "18:00",
      channel: "browser",
    });

    fireEvent.change(screen.getByLabelText("Reminder time"), { target: { value: "07:30" } });

    expect(screen.getByText("Daily at 07:30")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}")).toMatchObject({
      enabled: true,
      time: "07:30",
    });
  });

  it("hydrates persisted preferences on mount", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ enabled: true, time: "07:15", channel: "email" }),
    );

    renderPanel();

    expect(screen.getByText("Daily at 07:15")).toBeTruthy();
    const emailRadio = screen.getByRole("radio", { name: "Email draft" }) as HTMLInputElement;
    expect(emailRadio.checked).toBe(true);
  });

  it("reveals the email draft flow only for the email channel", () => {
    const onSendEmailDraft = vi.fn();
    renderPanel({ onSendEmailDraft, canSendDraft: true, email: "me@example.com" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable a daily reminder" }));
    expect(screen.queryByRole("button", { name: "Open reminder draft" })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Email draft" }));

    fireEvent.click(screen.getByRole("button", { name: "Open reminder draft" }));
    expect(onSendEmailDraft).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}")).toMatchObject({
      channel: "email",
    });
  });

  it("disables the draft button without a plan and explains why", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ enabled: true, time: "18:00", channel: "email" }),
    );

    renderPanel({ canSendDraft: false });

    const draftButton = screen.getByRole("button", { name: "Open reminder draft" }) as HTMLButtonElement;
    expect(draftButton.disabled).toBe(true);
    expect(screen.getByText("Generate today's plan first to fill the draft.")).toBeTruthy();
  });

  it("surfaces draft status messages from the planner", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ enabled: true, time: "18:00", channel: "email" }),
    );

    renderPanel({
      canSendDraft: true,
      draftStatus: { type: "error", message: "Add an email to send reminders." },
    });

    expect(screen.getByRole("alert").textContent).toBe("Add an email to send reminders.");
  });

  it("shows a dismissible in-session nudge when the reminder time arrives", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 18, 8, 59, 0, 0));
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ enabled: true, time: "09:00", channel: "browser" }),
    );

    renderPanel();

    expect(screen.queryByText("Reminder: it's time for today's plan.")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(screen.getByText("Reminder: it's time for today's plan.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Reminder: it's time for today's plan.")).toBeNull();
  });
});
