"use client";

import { useMemo } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { createCheckinStore } from "@/lib/checkin-store";

export function SyncStatusBadge() {
  const { authUser, authConfigured } = useCoachAuth();
  // Recompute on auth changes: with NEXT_PUBLIC_CHECKIN_BACKEND unset, the
  // backend resolves to Firestore only for signed-in users on Firebase-enabled
  // deployments, so the badge must track sign-in state to stay truthful.
  const backend = useMemo(
    () => createCheckinStore(undefined, { signedIn: Boolean(authUser) }).backend,
    [authUser],
  );

  if (!authConfigured) {
    return (
      <div
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-amber-500/10 text-amber-500 border border-amber-500/30"
        title="Firebase authentication is not configured in environment variables. Local backup enabled"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>GUEST (LOCAL)</span>
      </div>
    );
  }

  if (authUser) {
    if (backend === "firestore") {
      return (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
          title={`Check-ins sync to Firestore. Registered user: ${authUser.email}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CLOUD SYNCED</span>
        </div>
      );
    }

    if (backend === "firestore-fallback") {
      return (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-amber-500/10 text-amber-500 border border-amber-500/30"
          title="Cloud sync is configured but Firestore is unavailable right now. Check-ins are saved on this device"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>SYNC OFF (LOCAL)</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-sky-500/10 text-sky-500 border border-sky-500/30"
        title={`Signed in as ${authUser.email}, but check-ins stay on this device. Cloud sync is not enabled for this deployment`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        <span>SIGNED IN (LOCAL)</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-amber-500/10 text-amber-500 border border-amber-500/30"
      title="All data saved on your device. Authenticate with Google to back up and sync across devices"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      <span>LOCAL WORKSPACE</span>
    </div>
  );
}
