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

const actionVariantsMap: Record<FocusArea, Record<DailyDose, readonly string[]>> = {
  Fitness: {
    light: [
      "Do a 3-minute movement burst: 60s squats, 60s wall push-ups, 60s deep breathing.",
      "Take a brisk 3-minute walk and finish with three deep breaths.",
      "Run a 3-minute mobility reset for hips, shoulders, and neck.",
    ],
    medium: [
      "Complete a 10-minute strength circuit: squats, push-ups, rows, and core.",
      "Do a 10-minute interval workout: 30s work and 30s rest across four moves.",
      "Run a 10-minute bodyweight ladder and log your energy after.",
    ],
    deep: [
      "Do a 20-minute workout and log your energy before and after.",
      "Complete a focused 20-minute strength session with short rests.",
      "Run a 20-minute mixed cardio and mobility session, then note recovery level.",
    ],
  },
  Sleep: {
    light: [
      "Do a 3-minute pre-sleep prep: set your wind-down alarm and dim one light source.",
      "Use 3 minutes to prep your sleep space: water, cool room, and device cutoff.",
      "Take 3 minutes to queue tomorrow's bedtime reminder and clear bedside clutter.",
    ],
    medium: [
      "Run a 10-minute wind-down: no screens, dim lights, and light stretching.",
      "Complete a 10-minute sleep prep routine with breathing and room reset.",
      "Do a 10-minute digital sunset and set up your bedtime cues.",
    ],
    deep: [
      "Audit your sleep environment for 20 minutes and design a tighter bedtime routine.",
      "Run a 20-minute sleep reset: environment check plus next-week bedtime plan.",
      "Use 20 minutes to map sleep blockers and create one concrete nightly protocol.",
    ],
  },
  "Deep Work": {
    light: [
      "Run one 3-minute focus sprint on your most valuable task.",
      "Use 3 minutes to remove distractions and start the single highest-impact task.",
      "Do a 3-minute execution kickoff: define one outcome and begin immediately.",
    ],
    medium: [
      "Run one 10-minute focus block with zero context switching.",
      "Use 10 minutes for uninterrupted deep work on one priority deliverable.",
      "Do a 10-minute concentration block and ship one tiny visible increment.",
    ],
    deep: [
      "Run two 10-minute focus blocks and ship one meaningful deliverable.",
      "Do a 20-minute deep work session with a strict single-task scope.",
      "Use 20 minutes to complete the hardest part of your top task.",
    ],
  },
  Communication: {
    light: [
      "Use 3 minutes to send one clear status update to someone waiting on you.",
      "Take 3 minutes to clarify one message and remove ambiguity before sending.",
      "Do a 3-minute communication cleanup: one concise reply, one clear next step.",
    ],
    medium: [
      "Spend 10 minutes preparing and delivering a difficult message using SBI.",
      "Use 10 minutes to script key points and send a high-clarity communication.",
      "Do a 10-minute communication sprint: align expectations and confirm ownership.",
    ],
    deep: [
      "Hold a 20-minute high-stakes conversation and document what worked.",
      "Use 20 minutes to resolve one communication bottleneck end-to-end.",
      "Run a 20-minute alignment call and capture decisions in writing.",
    ],
  },
  Mindfulness: {
    light: [
      "Do a 3-minute breathing session and note your current mood.",
      "Take 3 minutes for a body scan and write one-word emotional state.",
      "Use 3 minutes to pause, breathe, and identify your dominant feeling.",
    ],
    medium: [
      "Complete a 10-minute mindfulness practice and short journal entry.",
      "Do a 10-minute guided meditation followed by one reflective note.",
      "Run a 10-minute reset: breathwork plus a quick gratitude check-in.",
    ],
    deep: [
      "Do a 20-minute guided session and a full values check-in.",
      "Use 20 minutes for mindfulness practice and a focused reflection review.",
      "Run a 20-minute awareness session and document two emotional triggers.",
    ],
  },
  Finances: {
    light: [
      "Use 3 minutes to review yesterday's spending and categorize key transactions.",
      "Take 3 minutes to log recent purchases and flag one avoidable expense.",
      "Do a 3-minute money check: totals, anomalies, and one quick correction.",
    ],
    medium: [
      "Spend 10 minutes setting this week's spending limits in your budget tracker.",
      "Use 10 minutes to reconcile accounts and update category caps.",
      "Run a 10-minute budget tune-up and define one spending rule for this week.",
    ],
    deep: [
      "Review monthly cash flow for 20 minutes and choose one concrete optimization.",
      "Use 20 minutes to analyze recurring expenses and set one reduction action.",
      "Run a 20-minute financial planning block and lock one savings move.",
    ],
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

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickActionVariant(focus: FocusArea, dose: DailyDose, date: string, notes?: string) {
  const variants = actionVariantsMap[focus][dose];
  const seed = `${date}|${focus}|${dose}|${notes ?? ""}`;
  const selected = variants[stableHash(seed) % variants.length];
  return selected;
}

export function buildDailyPlan(input: z.infer<typeof dailyPlanInputSchema>): DailyPlan {
  const minutes = doseMinutes[input.dose];
  const date = new Date().toISOString().slice(0, 10);

  return {
    date,
    focus: input.focus,
    dose: input.dose,
    minutes,
    action: pickActionVariant(input.focus, input.dose, date, input.notes),
    reflection: reflectionMap[input.focus],
    optionalResource: input.dose === "light" ? null : resourceMap[input.focus],
    capMessage: "You reached today's plan. See you tomorrow.",
  };
}
