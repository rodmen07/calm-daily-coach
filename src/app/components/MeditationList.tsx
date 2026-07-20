import React from 'react';
import { MEDITATIONS, type Meditation } from '@/lib/meditations';

type MeditationListProps = {
  className?: string;
  onSelect?: (meditation: Meditation) => void;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins}m` : `${mins}:${secs.toString().padStart(2, '0')}`;
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.25rem 0.5rem',
  borderRadius: 9999,
  // Theme-aware surface token, not a hardcoded light-mode-only overlay - see
  // globals.css. A fixed rgba(0,0,0,0.06) reads as a barely-there gray tint
  // on a light background but as a near-invisible smudge on this app's dark
  // theme background, which is the same defect class as the description
  // text color below.
  background: 'var(--field)',
  fontSize: '0.875rem',
};

export const MeditationList: React.FC<MeditationListProps> = ({ className, onSelect }) => {
  return (
    <div className={className ?? ''}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
        {MEDITATIONS.map((m) => (
          <li
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              borderRadius: 8,
              // Theme-aware line token (same one every other panel/card in
              // this app uses), not a hardcoded rgba(0,0,0,0.06) that assumes
              // a light background.
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{m.title}</span>
              {m.description ? (
                // Fix: this was a hardcoded near-black rgba(0,0,0,0.6),
                // invisible/near-invisible against this app's dark theme
                // background (--background is near-black in dark mode) -
                // the exact defect class theme-token-guard.test.ts exists to
                // catch, except set here via an inline style object rather
                // than a Tailwind class, which that guard's className-only
                // regex cannot see. --muted is the app's existing secondary-
                // text token (used the same way in globals.css's
                // .flow-detail/.dose-hint/.plan-pill-label rules) and flips
                // correctly with the theme.
                <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{m.description}</span>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={badgeStyle}>{formatDuration(m.durationSeconds)}</span>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 6,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Play
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MeditationList;
