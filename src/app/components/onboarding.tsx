"use client";

import { useEffect, useState } from "react";
import { FOCUS_AREAS, type FocusArea, type DailyDose } from "@/lib/plan";
import { type OnboardingPreferences, saveOnboardingPreferences } from "@/lib/onboarding";
import { trackMonetizationEvent } from "@/lib/monetization";

type OnboardingProps = {
  onComplete: (prefs: OnboardingPreferences) => void;
  onSkip: () => void;
};

type OnboardingPreset = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
  defaultFocus: FocusArea;
  defaultDose: DailyDose;
  defaultTheme: "light" | "dark";
};

const ONBOARDING_PRESETS: OnboardingPreset[] = [
  {
    id: "balanced",
    label: "Balanced start",
    description: "Sustainable daily progress without overload.",
    recommended: true,
    defaultFocus: "Deep Work",
    defaultDose: "medium",
    defaultTheme: "dark",
  },
  {
    id: "light-reset",
    label: "Light reset",
    description: "Low-friction consistency to rebuild momentum.",
    defaultFocus: "Mindfulness",
    defaultDose: "light",
    defaultTheme: "light",
  },
  {
    id: "deep-builder",
    label: "Deep builder",
    description: "High-intensity sessions for major outcomes.",
    defaultFocus: "Career",
    defaultDose: "deep",
    defaultTheme: "dark",
  },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [defaultFocus, setDefaultFocus] = useState<FocusArea>("Deep Work");
  const [defaultDose, setDefaultDose] = useState<DailyDose>("medium");
  const [defaultTheme, setDefaultTheme] = useState<"light" | "dark">("dark");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("balanced");

  useEffect(() => {
    trackMonetizationEvent("onboarding_started", "starter", "onboarding");
  }, []);

  useEffect(() => {
    trackMonetizationEvent("onboarding_step_viewed", "starter", "onboarding", `step_${activeStep}`);
  }, [activeStep]);

  function applyPreset(preset: OnboardingPreset) {
    setDefaultFocus(preset.defaultFocus);
    setDefaultDose(preset.defaultDose);
    setDefaultTheme(preset.defaultTheme);
    setSelectedPresetId(preset.id);
    trackMonetizationEvent("onboarding_preset_selected", "starter", "onboarding", preset.id);
  }

  function handleComplete() {
    const prefs: OnboardingPreferences = {
      defaultFocus,
      defaultDose,
      defaultTheme,
    };
    trackMonetizationEvent(
      "onboarding_completed",
      "starter",
      "onboarding",
      `step_${activeStep}${selectedPresetId ? `:${selectedPresetId}` : ""}`,
    );
    saveOnboardingPreferences(prefs);
    onComplete(prefs);
  }

  function handleSkip() {
    trackMonetizationEvent("onboarding_skipped", "starter", "onboarding", `step_${activeStep}`);
    onSkip();
  }

  return (
    <div className="rounded-2xl border border-[--line] bg-[--panel] p-6 shadow-xl" data-testid="onboarding-container">
      <div className="mb-4 flex items-center justify-between border-b border-[--line] pb-3">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h2 className="text-xl font-semibold tracking-tight">Personalize your coach</h2>
          <p className="mt-1 text-xs text-[--muted]">Pick a path now. You can fine-tune anytime after your first loop.</p>
        </div>
        <button
          className="text-xs font-semibold uppercase tracking-wider text-[--muted] hover:text-[--foreground]"
          type="button"
          onClick={handleSkip}
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

      <div className="mb-5 rounded-xl border border-[--line] bg-[--field] px-3 py-2.5 text-xs sm:text-sm">
        <p className="font-semibold uppercase tracking-wide text-[--muted]">Your defaults</p>
        <p className="mt-1 text-[--muted-strong]">
          Focus: <span className="font-semibold">{defaultFocus}</span> | Dose: <span className="font-semibold capitalize">{defaultDose}</span> | Theme: <span className="font-semibold capitalize">{defaultTheme}</span>
        </p>
      </div>

      {activeStep === 1 && (
        <section className="space-y-4 animate-fade-in" aria-label="Step 1: Core Focus selection">
          <div>
            <h3 className="text-base font-semibold">Pick your starting path</h3>
            <p className="dose-hint mt-1 text-xs">This becomes your default category when preparing daily routines.</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {ONBOARDING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`rounded-xl border p-3 text-left transition-all ${
                  selectedPresetId === preset.id
                    ? "border-[--accent] bg-[--accent]/10"
                    : "border-[--line] bg-[--field] hover:border-[--muted]"
                }`}
                onClick={() => applyPreset(preset)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{preset.label}</p>
                  {preset.recommended ? (
                    <span className="rounded-full border border-[--accent] bg-[--accent]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[--accent]">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[--muted]">{preset.description}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-[--muted]">
                  {preset.defaultFocus} • {preset.defaultDose} • {preset.defaultTheme}
                </p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-56 overflow-y-auto pr-1">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                className={`category-chip justify-center text-center w-full focus:ring-2 focus:ring-[--accent] ${
                  defaultFocus === area ? "is-selected border-[--accent]" : "bg-[--field] border-transparent"
                }`}
                onClick={() => {
                  setDefaultFocus(area);
                  setSelectedPresetId(null);
                }}
              >
                {area}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-3">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setActiveStep(2)}
            >
              Customize step-by-step
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={handleComplete}
            >
              Quick start now
            </button>
          </div>
          <p className="text-xs text-[--muted]">You can adjust focus, dose, or theme anytime from Focus.</p>
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
                {/* Visual Intensity Bars indicator */}
                <div className="flex gap-1 my-2 justify-center">
                  <span className={`inline-block h-3.5 w-1.5 rounded-full transition-all duration-300 ${
                    defaultDose === option ? "bg-[--accent] scale-y-110 shadow-[0_0_8px_rgba(122,214,183,0.3)]" : "bg-[--line]"
                  }`} />
                  <span className={`inline-block h-3.5 w-1.5 rounded-full transition-all duration-300 ${
                    option === "medium" || option === "deep"
                      ? defaultDose === option ? "bg-[--accent] scale-y-110 shadow-[0_0_8px_rgba(122,214,183,0.3)]" : "bg-[--line]"
                      : "bg-transparent border border-dashed border-[--line] opacity-45"
                  }`} />
                  <span className={`inline-block h-3.5 w-1.5 rounded-full transition-all duration-300 ${
                    option === "deep"
                      ? defaultDose === option ? "bg-[--accent] scale-y-110 shadow-[0_0_8px_rgba(122,214,183,0.3)]" : "bg-[--line]"
                      : "bg-transparent border border-dashed border-[--line] opacity-45"
                  }`} />
                </div>
                <span className="text-xs">
                  {option === "light" ? "5-minute burst" : option === "medium" ? "15-minute routine" : "30-minute deep session"}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2 pt-3">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setActiveStep(1)}
            >
              Back
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setActiveStep(3)}
              >
                Continue
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleComplete}
              >
                Save and start now
              </button>
            </div>
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
          <div className="flex flex-wrap justify-between gap-2 pt-3">
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
              Save and start now
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
