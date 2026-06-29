"use client";

import { useSyncExternalStore } from "react";
import { getPlanInterest, setPlanInterest, type PlanInterest } from "@/lib/monetization";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener("monetizationchange", callback);

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
      window.removeEventListener("monetizationchange", callback);
    }
  };
}

export function useMonetization() {
  const planInterest = useSyncExternalStore<PlanInterest>(
    subscribe,
    getPlanInterest,
    () => "starter" as PlanInterest,
  );

  return {
    planInterest,
    setPlanInterest: (tier: PlanInterest) => setPlanInterest(tier),
  };
}
