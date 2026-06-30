"use client";

import { useCoachAuth } from "@/app/hooks/use-coach-auth";

export function SyncStatusBadge() {
  const { authUser, authConfigured } = useCoachAuth();

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
    return (
      <div 
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider transition-colors bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
        title={`Synced to secure cloud database. Registered user: ${authUser.email}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>CLOUD SYNCED</span>
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
