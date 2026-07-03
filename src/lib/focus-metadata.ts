import type { FocusArea } from "@/lib/plan";

export type FocusMetadata = {
  icon: string;
};

export const FOCUS_METADATA: Record<FocusArea, FocusMetadata> = {
  Career: { icon: "💼" },
  Communication: { icon: "📣" },
  Creativity: { icon: "🎨" },
  "Deep Work": { icon: "💻" },
  Finances: { icon: "💵" },
  Fitness: { icon: "💪" },
  Hobbies: { icon: "🎮" },
  Home: { icon: "🏠" },
  Learning: { icon: "📚" },
  Mindfulness: { icon: "🧘" },
  Nutrition: { icon: "🍎" },
  Organization: { icon: "🗂️" },
  Relationships: { icon: "❤️" },
  Sleep: { icon: "😴" },
  Writing: { icon: "✍️" },
};
