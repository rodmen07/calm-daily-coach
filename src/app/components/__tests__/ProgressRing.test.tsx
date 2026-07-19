import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProgressRing from '../ProgressRing';

// jsdom has no matchMedia; install a minimal stub so the component can read
// the prefers-reduced-motion preference during tests.
function stubMatchMedia(matches: boolean) {
  const mediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList));
  return mediaQueryList;
}

describe('ProgressRing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('animates from 0 to target percentage within duration', () => {
    const target = 75;
    const duration = 1000;
    render(<ProgressRing percentage={target} duration={duration} radius={30} />);

    // initial value should be 0%
    const text = screen.getByTestId('progress-text');
    expect(text.textContent).toBe('0%');

    // advance time to finish animation
    act(() => {
      vi.advanceTimersByTime(duration + 100);
    });

    expect(text.textContent).toBe(`${target}%`);

    // verify circle dashoffset approximates expected
    const circle = screen.getByTestId('progress-circle') as unknown as SVGCircleElement;
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const expectedOffset = circumference * (1 - target / 100);

    const offsetAttr = Number(circle.getAttribute('stroke-dashoffset'));
    // Allow some margin due to rounding
    expect(Math.abs(offsetAttr - expectedOffset)).toBeLessThan(1);
  });

  it('renders the final value immediately when prefers-reduced-motion is set', () => {
    stubMatchMedia(true);
    render(<ProgressRing percentage={80} duration={1000} radius={30} />);

    // No timers have advanced: with reduced motion the ring must already show
    // the target instead of counting up from zero.
    expect(screen.getByTestId('progress-text').textContent).toBe('80%');

    const circle = screen.getByTestId('progress-circle') as unknown as SVGCircleElement;
    const circumference = 2 * Math.PI * 30;
    const expectedOffset = circumference * (1 - 80 / 100);
    const offsetAttr = Number(circle.getAttribute('stroke-dashoffset'));
    expect(Math.abs(offsetAttr - expectedOffset)).toBeLessThan(1);
  });

  it('still animates when matchMedia reports no reduced-motion preference', () => {
    stubMatchMedia(false);
    render(<ProgressRing percentage={60} duration={500} />);

    const text = screen.getByTestId('progress-text');
    expect(text.textContent).toBe('0%');

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(text.textContent).toBe('60%');
  });

  it('exposes a caller-provided accessible label and keeps a safe default', () => {
    render(<ProgressRing percentage={40} ariaLabel="Today's progress: 40 percent" />);
    expect(screen.getByRole('img', { name: "Today's progress: 40 percent" })).toBeTruthy();

    cleanup();

    render(<ProgressRing percentage={40} />);
    expect(screen.getByRole('img', { name: 'Progress ring' })).toBeTruthy();
  });
});
