import React, { useEffect, useMemo, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// The fill animation is driven by a JS timer, so CSS media queries alone cannot
// stop it. Read the preference directly, guarded for SSR and for test
// environments (jsdom) where matchMedia does not exist.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

type ProgressRingProps = {
  percentage: number;
  duration?: number;
  radius?: number;
  strokeWidth?: number;
  ariaLabel?: string;
};

export default function ProgressRing({
  percentage,
  duration = 800,
  radius = 32,
  strokeWidth = 8,
  ariaLabel = 'Progress ring',
}: ProgressRingProps) {
  const clampedTarget = Math.max(0, Math.min(100, percentage));
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  // Under reduced motion the ring paints its final value on the first render
  // instead of counting up from zero.
  const [displayed, setDisplayed] = useState(() =>
    prefersReducedMotion() ? clampedTarget : 0,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    if (typeof query.addEventListener !== 'function') {
      return;
    }

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const effectiveDuration = reducedMotion ? 0 : duration;

  useEffect(() => {
    const target = clampedTarget;

    if (effectiveDuration <= 0) {
      const immediate = setTimeout(() => setDisplayed(target), 0);
      return () => clearTimeout(immediate);
    }

    if (target === 0) {
      const reset = setTimeout(() => setDisplayed(0), 0);
      return () => clearTimeout(reset);
    }

    const frameMs = 16;
    const steps = Math.max(1, Math.ceil(effectiveDuration / frameMs));
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current = Math.min(target, current + increment);
      setDisplayed(current);

      if (current >= target) {
        clearInterval(timer);
      }
    }, frameMs);

    return () => clearInterval(timer);
  }, [clampedTarget, effectiveDuration]);

  const normalizedRadius = Math.max(1, radius);
  const normalizedStroke = Math.max(1, strokeWidth);
  const size = normalizedRadius * 2 + normalizedStroke;

  const circumference = useMemo(() => 2 * Math.PI * normalizedRadius, [normalizedRadius]);
  const dashOffset = circumference * (1 - displayed / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={normalizedRadius}
        fill="none"
        stroke="currentColor"
        opacity={0.2}
        strokeWidth={normalizedStroke}
      />
      <circle
        data-testid="progress-circle"
        cx={size / 2}
        cy={size / 2}
        r={normalizedRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={normalizedStroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        data-testid="progress-text"
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {`${Math.round(displayed)}%`}
      </text>
    </svg>
  );
}
