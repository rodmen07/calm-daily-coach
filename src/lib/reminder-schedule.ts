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
