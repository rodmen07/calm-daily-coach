export type ChallengeCategory = "mindfulness" | "productivity" | "wellness" | "connection";

export interface MicroChallenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  durationMinutes: number;
}

export interface ChallengeProgress {
  completedIds: string[];
  lastCompletedDate: string | null; // YYYY-MM-DD
}

export const MICRO_CHALLENGES: MicroChallenge[] = [
  // Mindfulness
  {
    id: "mind-001",
    title: "The 3-Breath Pause",
    description: "Pause what you are doing. Close your eyes and take 3 deep, slow breaths. Notice the feeling of air entering and leaving your lungs.",
    category: "mindfulness",
    durationMinutes: 1,
  },
  {
    id: "mind-002",
    title: "Ambient Detail Spotting",
    description: "Look around your current space. Spot 3 things you normally ignore (a texture, a shadow, a tiny speck of color). Observe them quietly.",
    category: "mindfulness",
    durationMinutes: 2,
  },
  {
    id: "mind-003",
    title: "Gratitude Reflection",
    description: "Write down or think deeply about one specific thing that made you smile in the last 24 hours. Relive that moment for a minute.",
    category: "mindfulness",
    durationMinutes: 2,
  },
  {
    id: "mind-004",
    title: "Digital Free Coffee",
    description: "Drink your next beverage (coffee, tea, or water) completely without looking at any screen. Focus 100% on the flavor and warmth.",
    category: "mindfulness",
    durationMinutes: 5,
  },

  // Productivity
  {
    id: "prod-001",
    title: "The 2-Minute Declutter",
    description: "Pick one physically messy area in your immediate sight (desktop, drawer, kitchen counter) and tidy it rapidly for 120 seconds.",
    category: "productivity",
    durationMinutes: 2,
  },
  {
    id: "prod-002",
    title: "Inbox Zero Sweep",
    description: "Archive, delete, or file as many low-priority notification emails as you can in a quick 5-minute single-task sprint.",
    category: "productivity",
    durationMinutes: 5,
  },
  {
    id: "prod-003",
    title: "The Monotasking Pledge",
    description: "Pick one upcoming task. Close all browser tabs and apps not related to it. Work on ONLY that task for 15 minutes without switching.",
    category: "productivity",
    durationMinutes: 15,
  },
  {
    id: "prod-004",
    title: "Tomorrow's Top Three",
    description: "Draft exactly three bullet points representing your absolute highest value outcomes for tomorrow. Pin them clearly.",
    category: "productivity",
    durationMinutes: 3,
  },

  // Wellness
  {
    id: "well-001",
    title: "Spine Alignment Stretch",
    description: "Stand up, interlock your fingers, and reach high toward the ceiling. Hold for 15 seconds, twice, while rolling your shoulders back.",
    category: "wellness",
    durationMinutes: 1,
  },
  {
    id: "well-002",
    title: "Hydration Flush",
    description: "Fill a large glass of pure, cold water. Drink it slowly, focusing on refreshing your body after hours of focus work.",
    category: "wellness",
    durationMinutes: 1,
  },
  {
    id: "well-003",
    title: "Palming Eye Relax",
    description: "Rub your palms together until warm, then cup them lightly over your closed eyes for 60 seconds of complete pitch darkness.",
    category: "wellness",
    durationMinutes: 1,
  },
  {
    id: "well-004",
    title: "Cozy Walkabout",
    description: "Walk around your block, office, or garden without any phone or headphones. Feel air, watch natural motion.",
    category: "wellness",
    durationMinutes: 5,
  },

  // Connection
  {
    id: "conn-001",
    title: "The Micro-Appreciation",
    description: "Send a quick, unsolicited text message to a friend, peer, or family member expressing a brief, specific thank you.",
    category: "connection",
    durationMinutes: 2,
  },
  {
    id: "conn-002",
    title: "Active Listener Reset",
    description: "In your next conversation, make a deliberate effort to let the other person completely finish speaking before processing your thoughts.",
    category: "connection",
    durationMinutes: 5,
  },
  {
    id: "conn-003",
    title: "Community Spot Check",
    description: "Upvote, congratulate, or leave one genuinely encouraging feedback comment on a colleague's or local builder's work.",
    category: "connection",
    durationMinutes: 2,
  },
];

export const STORAGE_CHALLENGES_KEY = "calm-daily-coach:challenges";

export function loadChallengeProgress(): ChallengeProgress {
  if (typeof window === "undefined") {
    return { completedIds: [], lastCompletedDate: null };
  }

  const stored = window.localStorage.getItem(STORAGE_CHALLENGES_KEY);
  if (!stored) {
    return { completedIds: [], lastCompletedDate: null };
  }

  try {
    // Legacy stored payloads may still carry streak fields; they are dropped here.
    const parsed = JSON.parse(stored);
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      lastCompletedDate: parsed.lastCompletedDate || null,
    };
  } catch {
    return { completedIds: [], lastCompletedDate: null };
  }
}

export function saveChallengeProgress(progress: ChallengeProgress): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(progress));
}

export function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Records a challenge completion without any streak mechanics: the id is added
 * once and today's date is stamped so the UI can show a calm daily status.
 */
export function recordChallengeCompletion(
  currentProgress: ChallengeProgress,
  completedId: string,
  today: string,
): ChallengeProgress {
  const completedIds = [...currentProgress.completedIds];
  if (!completedIds.includes(completedId)) {
    completedIds.push(completedId);
  }

  return {
    completedIds,
    lastCompletedDate: today,
  };
}
