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
  background: 'rgba(0,0,0,0.06)',
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
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{m.title}</span>
              {m.description ? (
                <span style={{ fontSize: '0.9rem', color: 'rgba(0,0,0,0.6)' }}>{m.description}</span>
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
