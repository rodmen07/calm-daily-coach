"use client";

import { useEffect, useState } from "react";
import { FOCUS_AREAS, type FocusArea, type DailyDose } from "@/lib/plan";
import { type OnboardingPreferences, saveOnboardingPreferences, getOnboardingPreferences } from "@/lib/onboarding";

type OnboardingProps = {
  onComplete: (prefs: OnboardingPreferences) => void;
  onSkip: () => void;
};

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [defaultFocus, setDefaultFocus] = useState<FocusArea>("Deep Work");
  const [defaultDose, setDefaultDose] = useState<DailyDose>("light");
  const [defaultTheme, setDefaultTheme] = useState<"light" | "dark">("dark");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  function handleComplete() {
    const prefs: OnboardingPreferences = {
      defaultFocus,
      defaultDose,
      defaultTheme,
    };
    saveOnboardingPreferences(prefs);
    onComplete(prefs);
  }

  return (
    <div className="rounded-2xl border border-[--line] bg-[--panel] p-6 shadow-xl" data-testid="onboarding-container">
      <div className="mb-4 flex items-center justify-between border-b border-[--line] pb-3">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h2 className="text-xl font-semibold tracking-tight">Personalize your coach</h2>
        </div>
        <button
          className="text-xs font-semibold uppercase tracking-wider text-[--muted] hover:text-[--foreground]"
          type="button"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>

      <div className="mb-6 flex justify-center gap-1.5" role="progressbar" aria-label="Onboarding progress" aria-valuenow={activeStep} aria-valuemin={1} aria-valuemax={3}>
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
              activeStep === step
                ? "bg-[--accent] w-14"
                : step < activeStep
                ? "bg-[--accent]/40"
                : "bg-[--line]"
            }`}
          />
        ))}
      </div>

      {activeStep === 1 && (
        <section className="space-y-4 animate-fade-in" aria-label="Step 1: Core Focus selection">
          <div>
            <h3 className="text-base font-semibold">Select your primary focus area</h3>
            <p className="dose-hint mt-1 text-xs">This becomes your default category when preparing daily routines.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-56 overflow-y-auto pr-1">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                className={`category-chip justify-center text-center w-full focus:ring-2 focus:ring-[--accent] ${
                  defaultFocus === area ? "is-selected border-[--accent]" : "bg-[--field] border-transparent"
                }`}
                onClick={() => setDefaultFocus(area)}
              >
                {area}
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-3">
            <button
              className="primary-button"
              type="button"
              onClick={() => setActiveStep(2)}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {activeStep === 2 && (
        <section className="space-y-4" aria-label="Step 2: Default Dose selection">
          <div>
            <h3 className="text-base font-semibold">Decide on a daily dose limit</h3>
            <p className="dose-hint mt-1 text-xs">How long do you want your daily deliberate sessions to last by default?</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {(["light", "medium", "deep"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-all ${
                  defaultDose === option
                    ? "border-[--accent] bg-[--accent]/10 text-[--foreground]"
                    : "border-[--line] bg-[--field] text-[--muted] hover:border-[--muted]"
                }`}
                onClick={() => setDefaultDose(option)}
              >
                <span className="font-semibold capitalize">{option}</span>
                <span className="text-xs">
                  {option === "light" ? "5-minute burst" : option === "medium" ? "15-minute routine" : "30-minute deep session"}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-3">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setActiveStep(1)}
            >
              Back
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => setActiveStep(3)}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {activeStep === 3 && (
        <section className="space-y-4" aria-label="Step 3: Theme preference">
          <div>
            <h3 className="text-base font-semibold">Choose your background mode</h3>
            <p className="dose-hint mt-1 text-xs">Select your preferred viewing experience for planning and reflection sessions.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["dark", "light"] as const).map((themeOption) => (
              <button
                key={themeOption}
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-5 text-center transition-all ${
                  defaultTheme === themeOption
                    ? "border-[--accent] bg-[--accent]/10 text-[--foreground]"
                    : "border-[--line] bg-[--field] text-[--muted] hover:border-[--muted]"
                }`}
                onClick={() => setDefaultTheme(themeOption)}
              >
                <div
                  className={`h-4 w-4 rounded-full border border-current ${
                    themeOption === "dark" ? "bg-[#0b1220]" : "bg-[#f5efe2]"
                  }`}
                />
                <span className="font-semibold capitalize">{themeOption === "dark" ? "Dark theme (recommended)" : "Light theme"}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-3">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setActiveStep(2)}
            >
              Back
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={handleComplete}
            >
              Complete onboarding
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
