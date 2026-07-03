"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";

type SwipeStepCardProps = {
  stepLabel: string;
  title: string;
  description: string;
  previousHref?: string;
  previousLabel?: string;
  nextHref?: string;
  nextLabel?: string;
  children: ReactNode;
};

const HORIZONTAL_SWIPE_THRESHOLD = 56;

export function SwipeStepCard({
  stepLabel,
  title,
  description,
  previousHref,
  previousLabel,
  nextHref,
  nextLabel,
  children,
}: SwipeStepCardProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const swipeHint = previousHref && nextHref
    ? "Swipe left or right to move between steps. Use ArrowLeft or ArrowRight too."
    : nextHref
      ? "Swipe left or press ArrowRight to continue."
      : previousHref
        ? "Swipe right or press ArrowLeft to go back."
        : "This step is focused."

  function navigateBySwipe(deltaX: number) {
    if (deltaX < 0 && nextHref) {
      router.push(nextHref);
      return;
    }

    if (deltaX > 0 && previousHref) {
      router.push(previousHref);
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < HORIZONTAL_SWIPE_THRESHOLD) {
      return;
    }

    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    navigateBySwipe(deltaX);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" && previousHref) {
      event.preventDefault();
      router.push(previousHref);
      return;
    }

    if (event.key === "ArrowRight" && nextHref) {
      event.preventDefault();
      router.push(nextHref);
    }
  }

  return (
    <article
      className="step-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${hintId}`}
    >
      <header className="step-card-header">
        <p className="eyebrow">{stepLabel}</p>
        <h1 id={titleId} className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p id={descriptionId} className="mb-3 text-sm leading-6 text-slate-700 sm:text-base">
          {description}
        </p>
        <div id={hintId} className="step-card-swipe-hint" aria-live="polite">
          {swipeHint}
        </div>
        <div className="step-card-direction-hints" aria-hidden="true">
          <span className={`direction-chip ${previousHref ? "is-active" : "is-disabled"}`}>
            {previousLabel ?? "Previous"}
          </span>
          <span className={`direction-chip ${nextHref ? "is-active" : "is-disabled"}`}>
            {nextLabel ?? "Next"}
          </span>
        </div>
      </header>

      <div className="step-card-body">{children}</div>

      <footer className="step-card-footer">
        <div className="flow-route-links text-sm">
          {previousHref && previousLabel ? (
            <Link className="secondary-button" href={previousHref}>
              {previousLabel}
            </Link>
          ) : null}
          {nextHref && nextLabel ? (
            <Link className="secondary-button" href={nextHref}>
              {nextLabel}
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
