export type PlanInterest = "starter" | "pro" | "team";

export type MonetizationEventName =
  | "pricing_plan_selected"
  | "pricing_cta_clicked"
  | "dashboard_pricing_clicked"
  | "dashboard_early_access_clicked";

export type MonetizationEvent = {
  name: MonetizationEventName;
  tier: "premium" | "free" | "pro"; // Backwards-compatible fallback mapping
  source: "pricing" | "dashboard";
  timestamp: string;
};

export type MonetizationSummary = {
  totalEvents: number;
  planSelections: number;
  pricingCtaClicks: number;
  dashboardPricingClicks: number;
  dashboardEarlyAccessClicks: number;
  byTier: Record<string, number>;
  ctaByTier: Record<string, number>;
  latestTimestamp: string | null;
};

export const MONETIZATION_STORAGE_KEY = "calm-daily-coach:plan-interest";
const MONETIZATION_EVENTS_KEY = "calm-daily-coach:monetization-events";
let cachedEventsRaw: string | null = null;
let cachedEvents: MonetizationEvent[] = [];

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

  const stored = typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage.getItem(MONETIZATION_STORAGE_KEY)
    : null;
  return stored === "pro" || stored === "team" ? stored : "starter";
}

export function setPlanInterest(tier: PlanInterest) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(MONETIZATION_STORAGE_KEY, tier);
  window.dispatchEvent(new Event("monetizationchange"));
}

export function trackMonetizationEvent(name: MonetizationEventName, tier: PlanInterest, source: "pricing" | "dashboard") {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  const existing = safeParseEvents(window.localStorage.getItem(MONETIZATION_EVENTS_KEY));
  const mappedTier: "premium" | "free" | "pro" = tier === "pro" || tier === "team" ? "premium" : "free";

  const nextEvent: MonetizationEvent = {
    name,
    tier: mappedTier,
    source,
    timestamp: new Date().toISOString(),
  };

  const nextEvents = [...existing, nextEvent].slice(-200);
  const serialized = JSON.stringify(nextEvents);
  cachedEventsRaw = serialized;
  cachedEvents = nextEvents;
  window.localStorage.setItem(MONETIZATION_EVENTS_KEY, serialized);
  window.dispatchEvent(new Event("monetizationchange"));
}

export function getMonetizationEvents(): MonetizationEvent[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(MONETIZATION_EVENTS_KEY);
  if (raw === cachedEventsRaw) {
    return cachedEvents;
  }

  const parsed = safeParseEvents(raw);
  cachedEventsRaw = raw;
  cachedEvents = parsed;
  return parsed;
}

export function clearMonetizationEvents() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(MONETIZATION_EVENTS_KEY);
  cachedEventsRaw = null;
  cachedEvents = [];
  window.dispatchEvent(new Event("monetizationchange"));
}

export function summarizeMonetizationEvents(events: MonetizationEvent[]): MonetizationSummary {
  const byTier: Record<string, number> = {
    free: 0,
    premium: 0,
  };

  const ctaByTier: Record<string, number> = {
    free: 0,
    premium: 0,
  };

  let planSelections = 0;
  let pricingCtaClicks = 0;
  let dashboardPricingClicks = 0;
  let dashboardEarlyAccessClicks = 0;

  for (const event of events) {
    const canonicalTier = event.tier === "pro" || event.tier === "premium" ? "premium" : "free";
    if (byTier[canonicalTier] !== undefined) {
      byTier[canonicalTier] += 1;
    }

    if (event.name === "pricing_plan_selected") {
      planSelections += 1;
    }

    if (event.name === "pricing_cta_clicked") {
      pricingCtaClicks += 1;
      if (ctaByTier[canonicalTier] !== undefined) {
        ctaByTier[canonicalTier] += 1;
      }
    }

    if (event.name === "dashboard_pricing_clicked") {
      dashboardPricingClicks += 1;
    }

    if (event.name === "dashboard_early_access_clicked") {
      dashboardEarlyAccessClicks += 1;
      if (ctaByTier[canonicalTier] !== undefined) {
        ctaByTier[canonicalTier] += 1;
      }
    }
  }

  const latestTimestamp =
    events.length > 0
      ? events
          .map((event) => event.timestamp)
          .sort((a, b) => (a > b ? -1 : 1))[0]
      : null;

  return {
    totalEvents: events.length,
    planSelections,
    pricingCtaClicks,
    dashboardPricingClicks,
    dashboardEarlyAccessClicks,
    byTier,
    ctaByTier,
    latestTimestamp,
  };
}
