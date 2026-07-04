import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProgressRing from '../ProgressRing';

describe('ProgressRing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
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
});
