import { z } from "zod";

const focusAreas = [
  "Fitness",
  "Sleep",
  "Deep Work",
  "Communication",
  "Mindfulness",
  "Finances",
] as const;

const doseOptions = ["light", "medium", "deep"] as const;

export const dailyPlanInputSchema = z.object({
  focus: z.enum(focusAreas),
  dose: z.enum(doseOptions),
  notes: z.string().max(280).optional(),
});

export type FocusArea = (typeof focusAreas)[number];
export type DailyDose = (typeof doseOptions)[number];

export type DailyPlan = {
  date: string;
  focus: FocusArea;
  dose: DailyDose;
  minutes: number;
  action: string;
  reflection: string;
  optionalResource: string | null;
  capMessage: string;
};

const actionMap: Record<FocusArea, Record<DailyDose, string>> = {
  Fitness: {
    light: "Take a 10-minute walk and finish with 1 minute of deep breathing.",
    medium:
      "Complete a 20-minute strength circuit: squats, push-ups, rows, and core.",
    deep: "Do a 20-minute workout and log your energy before and after.",
  },
  Sleep: {
    light: "Set your wind-down alarm 30 minutes before bedtime.",
    medium:
      "Run a 45-minute wind-down routine: no screens, dim lights, short stretch.",
    deep: "Audit your sleep environment and design a full bedtime routine.",
  },
  "Deep Work": {
    light: "Run one 15-minute focus sprint on your most valuable task.",
    medium: "Run two 25-minute focus blocks with 5-minute breaks.",
    deep:
      "Run three focus blocks and ship one meaningful deliverable before noon.",
  },
  Communication: {
    light: "Send one clear, concise update to someone waiting on you.",
    medium:
      "Prepare and deliver a difficult message using the SBI structure.",
    deep:
      "Hold one high-stakes conversation and document what worked afterward.",
  },
  Mindfulness: {
    light: "Do a 5-minute breathing session and note your current mood.",
    medium: "Complete a 15-minute mindfulness practice and short journal entry.",
    deep: "Do a 30-minute guided session and a full values check-in.",
  },
  Finances: {
    light: "Review yesterday's spending and categorize every transaction.",
    medium: "Set this week's spending limits and update your budget tracker.",
    deep: "Review monthly cash flow and choose one concrete optimization.",
  },
};

const reflectionMap: Record<FocusArea, string> = {
  Fitness: "What changed in your energy after completing this?",
  Sleep: "What is one adjustment that would improve tonight's sleep by 10%?",
  "Deep Work": "What interrupted your focus, and how will you prevent it tomorrow?",
  Communication: "Which phrase or framing made your message clearer?",
  Mindfulness: "What emotion showed up most strongly, and what triggered it?",
  Finances: "What spending decision today aligns with your long-term goals?",
};

const resourceMap: Record<FocusArea, string> = {
  Fitness: "Optional: Save a 20-minute bodyweight routine you can repeat tomorrow.",
  Sleep: "Optional: Write a 3-step wind-down checklist in your notes app.",
  "Deep Work": "Optional: Use a single-task timer for your next block.",
  Communication:
    "Optional: Draft key talking points before your next important conversation.",
  Mindfulness: "Optional: Use a guided breathing app for your next session.",
  Finances: "Optional: Create one spending category alert for this week.",
};

export const FOCUS_AREAS = focusAreas;
export const DOSE_OPTIONS = doseOptions;

const doseMinutes: Record<DailyDose, number> = {
  light: 3,
  medium: 10,
  deep: 20,
};

export function buildDailyPlan(input: z.infer<typeof dailyPlanInputSchema>): DailyPlan {
  const minutes = doseMinutes[input.dose];

  return {
    date: new Date().toISOString().slice(0, 10),
    focus: input.focus,
    dose: input.dose,
    minutes,
    action: actionMap[input.focus][input.dose],
    reflection: reflectionMap[input.focus],
    optionalResource: input.dose === "light" ? null : resourceMap[input.focus],
    capMessage: "You reached today's plan. See you tomorrow.",
  };
}
