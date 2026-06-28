export type PlanInterest = "starter" | "pro" | "team";

export type MonetizationEventName =
  | "pricing_plan_selected"
  | "pricing_cta_clicked"
  | "dashboard_pricing_clicked"
  | "dashboard_early_access_clicked";

export type MonetizationEvent = {
  name: MonetizationEventName;
  tier: PlanInterest;
  source: "pricing" | "dashboard";
  timestamp: string;
};

export const MONETIZATION_STORAGE_KEY = "calm-daily-coach:plan-interest";
const MONETIZATION_EVENTS_KEY = "calm-daily-coach:monetization-events";

function safeParseEvents(raw: string | null): MonetizationEvent[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MonetizationEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (event) =>
        typeof event === "object" &&
        typeof event?.name === "string" &&
        typeof event?.tier === "string" &&
        typeof event?.source === "string" &&
        typeof event?.timestamp === "string",
    );
  } catch {
    return [];
  }
}

export function getPlanInterest(): PlanInterest {
  if (typeof window === "undefined") {
    return "starter";
  }

  const stored = window.localStorage.getItem(MONETIZATION_STORAGE_KEY);
  return stored === "pro" || stored === "team" ? stored : "starter";
}

export function setPlanInterest(tier: PlanInterest) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MONETIZATION_STORAGE_KEY, tier);
  window.dispatchEvent(new Event("monetizationchange"));
}

export function trackMonetizationEvent(name: MonetizationEventName, tier: PlanInterest, source: "pricing" | "dashboard") {
  if (typeof window === "undefined") {
    return;
  }

  const existing = safeParseEvents(window.localStorage.getItem(MONETIZATION_EVENTS_KEY));
  const nextEvent: MonetizationEvent = {
    name,
    tier,
    source,
    timestamp: new Date().toISOString(),
  };

  const nextEvents = [...existing, nextEvent].slice(-200);
  window.localStorage.setItem(MONETIZATION_EVENTS_KEY, JSON.stringify(nextEvents));
}

export function getMonetizationEvents(): MonetizationEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  return safeParseEvents(window.localStorage.getItem(MONETIZATION_EVENTS_KEY));
}
