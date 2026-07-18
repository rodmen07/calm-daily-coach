"use client";

import { useEffect, useState } from "react";
import type { AsyncStatus } from "@/lib/async-status";
import {
  loadReminderPreferences,
  saveReminderPreferences,
  type ReminderChannel,
  type ReminderPreferences,
} from "@/lib/reminder-preferences";
import { msUntilNextOccurrence } from "@/lib/reminder-schedule";

type ReminderSettingsPanelProps = {
  storageScope: string;
  email: string;
  onEmailChange: (value: string) => void;
  onSendEmailDraft: () => void;
  draftStatus: AsyncStatus;
  canSendDraft: boolean;
};

export function ReminderSettingsPanel({
  storageScope,
  email,
  onEmailChange,
  onSendEmailDraft,
  draftStatus,
  canSendDraft,
}: ReminderSettingsPanelProps) {
  const [prefs, setPrefs] = useState<ReminderPreferences>(() => loadReminderPreferences(storageScope));
  const [loadedScope, setLoadedScope] = useState(storageScope);
  const [nudgeVisible, setNudgeVisible] = useState(false);

  if (storageScope !== loadedScope) {
    setLoadedScope(storageScope);
    setPrefs(loadReminderPreferences(storageScope));
    setNudgeVisible(false);
  }

  function updatePrefs(update: Partial<ReminderPreferences>) {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      saveReminderPreferences(storageScope, next);
      return next;
    });
  }

  useEffect(() => {
    if (!prefs.enabled || prefs.channel !== "browser") {
      return;
    }

    const delay = msUntilNextOccurrence(prefs.time, new Date());
    if (delay === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setNudgeVisible(true);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [prefs.enabled, prefs.channel, prefs.time]);

  return (
    <section
      className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 py-3"
      aria-label="Daily reminder settings"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow !mb-0">Reminders</p>
        <p className="text-xs font-semibold text-[--accent]">
          {prefs.enabled ? `Daily at ${prefs.time}` : "Off"}
        </p>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(event) => updatePrefs({ enabled: event.target.checked })}
        />
        Enable a daily reminder
      </label>

      <p className="field-hint mt-2">
        Focus never sends anything automatically. Browser nudges appear only while the app is
        open, and email reminders open a prefilled draft in your mail app.
      </p>

      {prefs.enabled ? (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Reminder time
            <input
              className="field"
              type="time"
              value={prefs.time}
              onChange={(event) => updatePrefs({ time: event.target.value })}
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm text-slate-700">
            <legend className="mb-1">Reminder channel</legend>
            {(
              [
                { value: "browser", label: "Browser nudge (while the app is open)" },
                { value: "email", label: "Email draft" },
              ] as { value: ReminderChannel; label: string }[]
            ).map((channel) => (
              <label key={channel.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reminder-channel"
                  value={channel.value}
                  checked={prefs.channel === channel.value}
                  onChange={() => updatePrefs({ channel: channel.value })}
                />
                {channel.label}
              </label>
            ))}
          </fieldset>

          {prefs.channel === "email" ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Reminder email
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onSendEmailDraft}
                  disabled={!canSendDraft}
                >
                  Open reminder draft
                </button>
              </div>
              {!canSendDraft ? (
                <p className="field-hint">Generate today&apos;s plan first to fill the draft.</p>
              ) : null}
              {draftStatus.type === "ok" ? (
                <p className="text-sm text-emerald-700" aria-live="polite">
                  {draftStatus.message}
                </p>
              ) : null}
              {draftStatus.type === "error" ? (
                <p className="text-sm text-rose-700" role="alert" aria-live="assertive">
                  {draftStatus.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {nudgeVisible ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2"
          aria-live="polite"
        >
          <p className="text-sm text-slate-700">Reminder: it&apos;s time for today&apos;s plan.</p>
          <button className="secondary-button" type="button" onClick={() => setNudgeVisible(false)}>
            Dismiss
          </button>
        </div>
      ) : null}
    </section>
  );
}
