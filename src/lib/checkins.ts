import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DOSE_OPTIONS, FOCUS_AREAS, type DailyDose, type FocusArea } from "@/lib/plan";

const CHECKIN_FILE = path.join(process.cwd(), ".data", "checkins.json");

const checkinStatusOptions = ["done", "skipped"] as const;

export const checkinInputSchema = z.object({
  date: z.string().optional(),
  focus: z.enum(FOCUS_AREAS),
  dose: z.enum(DOSE_OPTIONS),
  minutes: z.number().int().positive(),
  status: z.enum(checkinStatusOptions),
  skipReason: z.string().max(180).optional(),
});

export type Checkin = {
  id: string;
  date: string;
  focus: FocusArea;
  dose: DailyDose;
  minutes: number;
  status: (typeof checkinStatusOptions)[number];
  skipReason?: string;
  createdAt: string;
};

type CheckinStore = {
  checkins: Checkin[];
};

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(CHECKIN_FILE), { recursive: true });

  try {
    await fs.access(CHECKIN_FILE);
  } catch {
    const emptyStore: CheckinStore = { checkins: [] };
    await fs.writeFile(CHECKIN_FILE, JSON.stringify(emptyStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<CheckinStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(CHECKIN_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as CheckinStore;
    return {
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [],
    };
  } catch {
    return { checkins: [] };
  }
}

async function writeStore(store: CheckinStore) {
  await fs.writeFile(CHECKIN_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function toDateOnly(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return asDate.toISOString().slice(0, 10);
}

export async function addCheckin(input: z.infer<typeof checkinInputSchema>) {
  const store = await readStore();

  const checkin: Checkin = {
    id: crypto.randomUUID(),
    date: toDateOnly(input.date),
    focus: input.focus,
    dose: input.dose,
    minutes: input.minutes,
    status: input.status,
    skipReason: input.status === "skipped" ? input.skipReason : undefined,
    createdAt: new Date().toISOString(),
  };

  store.checkins.push(checkin);
  await writeStore(store);

  return checkin;
}

export async function listRecentCheckins(limit = 30) {
  const store = await readStore();
  return [...store.checkins]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function getWeeklySummary(endDateInput?: string) {
  const store = await readStore();
  const endDate = new Date(toDateOnly(endDateInput));
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  const inWindow = store.checkins.filter((checkin) => {
    const d = new Date(checkin.date);
    return d >= startDate && d <= endDate;
  });

  const done = inWindow.filter((item) => item.status === "done").length;
  const skipped = inWindow.filter((item) => item.status === "skipped").length;

  const byFocus: Record<FocusArea, { done: number; skipped: number }> = {
    Fitness: { done: 0, skipped: 0 },
    Sleep: { done: 0, skipped: 0 },
    "Deep Work": { done: 0, skipped: 0 },
    Communication: { done: 0, skipped: 0 },
    Mindfulness: { done: 0, skipped: 0 },
    Finances: { done: 0, skipped: 0 },
  };

  for (const item of inWindow) {
    byFocus[item.focus][item.status] += 1;
  }

  return {
    windowStart: startDate.toISOString().slice(0, 10),
    windowEnd: endDate.toISOString().slice(0, 10),
    total: inWindow.length,
    done,
    skipped,
    completionRate: inWindow.length > 0 ? Number((done / inWindow.length).toFixed(2)) : 0,
    byFocus,
  };
}
