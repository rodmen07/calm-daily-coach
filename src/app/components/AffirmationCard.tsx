"use client";

import { useState } from "react";
import {
  AFFIRMATIONS,
  formatDateKey,
  getDailyAffirmation,
} from "@/lib/affirmations";

type AffirmationCardProps = {
  date?: Date;
};

export function AffirmationCard({ date }: AffirmationCardProps) {
  // Capture the day once at mount so the affirmation never swaps mid-session.
  const [dateKey] = useState(() => formatDateKey(date ?? new Date()));
  const [offset, setOffset] = useState(0);

  const affirmation = getDailyAffirmation(dateKey, offset);

  return (
    <section
      aria-label="Daily affirmation"
      className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow !mb-0">Daily affirmation</p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setOffset((prev) => (prev + 1) % AFFIRMATIONS.length)}
        >
          Show me another
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700" aria-live="polite">
        {affirmation}
      </p>
      <p className="field-hint mt-2">A new one arrives each day. Refresh any time.</p>
    </section>
  );
}
