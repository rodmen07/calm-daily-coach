import Link from "next/link";

export type CalmEmptyStateVariant = "plan" | "insights" | "slices" | "journal";

type CalmEmptyStateProps = {
  variant: CalmEmptyStateVariant;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary";
  compact?: boolean;
};

// Hand-authored decorative illustrations: simple strokes only, colored through
// currentColor (the accent) and the theme CSS variables so both themes work.
// They are aria-hidden; the title and message carry all the meaning.
function EmptyStateArt({ variant }: { variant: CalmEmptyStateVariant }) {
  const shared = {
    className: "empty-state-art",
    viewBox: "0 0 120 72",
    "aria-hidden": true,
    focusable: "false",
  } as const;

  if (variant === "plan") {
    // A sun resting on the horizon: the day has not started, and that is fine.
    return (
      <svg {...shared}>
        <line x1="14" y1="52" x2="106" y2="52" stroke="var(--line)" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M42 52a18 18 0 0 1 36 0"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line x1="60" y1="24" x2="60" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="41" y1="31" x2="35" y2="25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="79" y1="31" x2="85" y2="25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="60" x2="34" y2="60" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <line x1="86" y1="60" x2="100" y2="60" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }

  if (variant === "insights") {
    // A young sprout: insights grow on their own schedule.
    return (
      <svg {...shared}>
        <line x1="22" y1="56" x2="98" y2="56" stroke="var(--line)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="56" x2="60" y2="36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M60 44c-9 1-14-4-16-11 9-1 15 3 16 11z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M60 38c9 1 14-4 16-11-9-1-15 3-16 11z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M31 26h6M34 23v6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M86 20h6M89 17v6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }

  if (variant === "journal") {
    // An open notebook resting on a table: blank pages are restful, not late.
    return (
      <svg {...shared}>
        <line x1="16" y1="58" x2="104" y2="58" stroke="var(--line)" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M60 26c-8-5-19-5-27-1v29c8-4 19-4 27 1z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M60 26c8-5 19-5 27-1v29c-8 4-19 4-27 1z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <line x1="60" y1="26" x2="60" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M27 14h6M30 11v6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M88 12h6M91 9v6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }

  // "slices": one big soft outline turning into three small, doable pieces.
  return (
    <svg {...shared}>
      <rect
        x="16"
        y="14"
        width="50"
        height="44"
        rx="10"
        fill="none"
        stroke="var(--line)"
        strokeWidth="2.5"
        strokeDasharray="5 6"
        strokeLinecap="round"
      />
      <rect x="78" y="16" width="26" height="10" rx="5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" />
      <rect x="78" y="31" width="26" height="10" rx="5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" />
      <rect x="78" y="46" width="26" height="10" rx="5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

// A calm, reusable empty state: gentle illustration, one encouraging line,
// and at most one soft invitation to the action that fills the space.
// Deliberately free of urgency, counters, or guilt.
export function CalmEmptyState({
  variant,
  title,
  message,
  actionHref,
  actionLabel,
  actionVariant = "secondary",
  compact = false,
}: CalmEmptyStateProps) {
  return (
    <div
      className={`empty-state${compact ? " is-compact" : ""}`}
      data-testid={`empty-state-${variant}`}
    >
      <EmptyStateArt variant={variant} />
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-message">{message}</p>
      {actionHref && actionLabel ? (
        <div className="empty-state-action">
          <Link
            className={actionVariant === "primary" ? "primary-button" : "secondary-button"}
            href={actionHref}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
