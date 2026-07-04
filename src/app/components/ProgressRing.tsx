import React, { useEffect, useMemo, useState } from 'react';

type ProgressRingProps = {
  percentage: number;
  duration?: number;
  radius?: number;
  strokeWidth?: number;
};

export default function ProgressRing({
  percentage,
  duration = 800,
  radius = 32,
  strokeWidth = 8,
}: ProgressRingProps) {
  const clampedTarget = Math.max(0, Math.min(100, percentage));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = clampedTarget;

    if (duration <= 0) {
      const immediate = setTimeout(() => setDisplayed(target), 0);
      return () => clearTimeout(immediate);
    }

    if (target === 0) {
      const reset = setTimeout(() => setDisplayed(0), 0);
      return () => clearTimeout(reset);
    }

    const frameMs = 16;
    const steps = Math.max(1, Math.ceil(duration / frameMs));
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
  }, [clampedTarget, duration]);

  const normalizedRadius = Math.max(1, radius);
  const normalizedStroke = Math.max(1, strokeWidth);
  const size = normalizedRadius * 2 + normalizedStroke;

  const circumference = useMemo(() => 2 * Math.PI * normalizedRadius, [normalizedRadius]);
  const dashOffset = circumference * (1 - displayed / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Progress ring">
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
