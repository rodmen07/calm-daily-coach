/**
 * Browser-channel OS notifications, per docs/design/REMINDER_SCHEDULING.md
 * (v0.3 PR 2).
 *
 * Honest limits, stated wherever the user sees this feature:
 * - Notifications fire only while a Focus tab is open. There is no push
 *   service and no server; a static GitHub Pages site cannot deliver
 *   anything once the browser or tab is closed.
 * - iOS Safari tabs do not expose the Notification API, so iPhone users
 *   keep the in-page nudge.
 * - Permission is requested only in direct response to the user pressing
 *   the "Allow notifications" button, never on load, and never again after
 *   a denial.
 */

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export const REMINDER_NOTIFICATION_TITLE = "Focus";
export const REMINDER_NOTIFICATION_BODY = "Time for today's plan, whenever you are ready.";
export const REMINDER_NOTIFICATION_TAG = "focus-daily-reminder";

/**
 * Current permission state. "unsupported" outside the browser (SSR / static
 * export prerender) and wherever the Notification API is missing, such as
 * ordinary iOS Safari tabs.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  const permission = Notification.permission;
  return permission === "granted" || permission === "denied" ? permission : "default";
}

/**
 * Asks the browser for notification permission. Call only from a direct
 * user action (the "Allow notifications" button), never on load. When the
 * user already decided (granted or denied) or the API is unsupported, this
 * resolves immediately without prompting, so a denial is never re-prompted.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = getNotificationPermission();
  if (current !== "default") {
    return current;
  }

  try {
    const result = await Notification.requestPermission();
    return result === "granted" || result === "denied" ? result : "default";
  } catch {
    return getNotificationPermission();
  }
}

/**
 * Shows the daily reminder as one quiet OS notification. Returns true when
 * the notification was created; false when permission is missing, the API
 * is unsupported, or the constructor throws (some browsers, for example
 * Android Chrome, only allow page-created notifications via a service
 * worker). Callers fall back to the in-page nudge on false so the user
 * still gets exactly one gentle nudge.
 */
export function showReminderNotification(): boolean {
  if (getNotificationPermission() !== "granted") {
    return false;
  }

  try {
    new Notification(REMINDER_NOTIFICATION_TITLE, {
      body: REMINDER_NOTIFICATION_BODY,
      tag: REMINDER_NOTIFICATION_TAG,
    });
    return true;
  } catch {
    return false;
  }
}
