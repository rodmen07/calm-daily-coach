export type ReminderChannel = "browser" | "email" | "calendar";

export type ReminderPreferences = {
  enabled: boolean;
  time: string;
  channel: ReminderChannel;
};

const DEFAULT_PREFERENCES: ReminderPreferences = {
  enabled: false,
  time: "18:00",
  channel: "browser",
};

function preferencesKey(scope: string): string {
  return `calm-daily-coach:reminder-prefs:${scope}`;
}

function normalizeTime(value: string | undefined): string {
  if (!value) {
    return DEFAULT_PREFERENCES.time;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? value : DEFAULT_PREFERENCES.time;
}

export function getDefaultReminderPreferences(): ReminderPreferences {
  return { ...DEFAULT_PREFERENCES };
}

export function loadReminderPreferences(scope: string): ReminderPreferences {
  if (typeof window === "undefined") {
    return getDefaultReminderPreferences();
  }

  const raw = window.localStorage.getItem(preferencesKey(scope));
  if (!raw) {
    return getDefaultReminderPreferences();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReminderPreferences>;
    return {
      enabled: Boolean(parsed.enabled),
      time: normalizeTime(parsed.time),
      channel:
        parsed.channel === "email" || parsed.channel === "calendar" ? parsed.channel : "browser",
    };
  } catch {
    return getDefaultReminderPreferences();
  }
}

export function saveReminderPreferences(scope: string, prefs: ReminderPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    preferencesKey(scope),
    JSON.stringify({
      enabled: prefs.enabled,
      time: normalizeTime(prefs.time),
      channel: prefs.channel,
    }),
  );
}
