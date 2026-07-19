const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Milliseconds from `now` until the next occurrence of the local wall-clock
 * time `time` ("HH:MM"). If that time has already passed today, the next
 * occurrence is tomorrow. Returns null for malformed time strings.
 */
export function msUntilNextOccurrence(time: string, now: Date): number | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return null;
  }

  const next = new Date(now);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

export type ReminderScheduleHandle = {
  cancel: () => void;
};

/**
 * Arms a timer for the next occurrence of `time` and calls `onDue` when it
 * arrives, then re-arms for the following day. Browsers throttle timers in
 * hidden tabs, so the schedule also re-checks on visibilitychange: if the
 * due moment slipped past while the tab was hidden, `onDue` fires
 * immediately on return (capping drift); otherwise the timer is re-armed
 * from a freshly computed delay. Each daily occurrence fires at most once.
 * Returns null (and does nothing) outside the browser or for malformed
 * times.
 */
export function startReminderSchedule(
  time: string,
  onDue: () => void,
): ReminderScheduleHandle | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (msUntilNextOccurrence(time, new Date()) === null) {
    return null;
  }

  let timerId = 0;
  let dueAt = 0;

  function arm(): void {
    const delay = msUntilNextOccurrence(time, new Date());
    if (delay === null) {
      return;
    }
    dueAt = Date.now() + delay;
    timerId = window.setTimeout(fire, delay);
  }

  function fire(): void {
    onDue();
    arm();
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState !== "visible") {
      return;
    }
    window.clearTimeout(timerId);
    if (Date.now() >= dueAt) {
      fire();
    } else {
      arm();
    }
  }

  arm();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    cancel: () => {
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
