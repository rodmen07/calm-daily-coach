export const AFFIRMATIONS: readonly string[] = [
  "One small step today is enough.",
  "You are allowed to move at your own pace.",
  "Progress counts even when it feels slow.",
  "A short session still matters.",
  "Rest is part of the process, not a detour.",
  "You can begin again at any moment, gently.",
  "Your worth is not measured by your output.",
  "It is okay to do one thing at a time.",
  "Starting small is still starting.",
  "You do not have to earn your breaks.",
  "A scattered day does not erase your progress.",
  "Be as kind to yourself as you would be to a friend.",
  "Done gently is still done.",
  "You can pause without losing your place.",
  "Today does not need to be perfect to be worthwhile.",
  "Your attention is allowed to wander and return.",
  "Small efforts add up quietly.",
  "You are doing better than your inner critic says.",
];

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function formatDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function affirmationIndexForDate(dateKey: string, offset = 0): number {
  return (stableHash(dateKey) + offset) % AFFIRMATIONS.length;
}

export function getDailyAffirmation(dateKey: string, offset = 0): string {
  return AFFIRMATIONS[affirmationIndexForDate(dateKey, offset)];
}
