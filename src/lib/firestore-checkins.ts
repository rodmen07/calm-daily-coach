import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import { FOCUS_AREAS, type FocusArea } from "@/lib/plan";
import type { CheckinInput } from "@/lib/checkin-store";
import type { WeeklySummary } from "@/lib/browser-checkins";

type FirestoreCheckinDoc = CheckinInput & {
  createdAt: string;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnly(value?: string) {
  if (!value) {
    return todayDate();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return todayDate();
  }

  return parsed.toISOString().slice(0, 10);
}

function createFocusSummary() {
  return Object.fromEntries(
    FOCUS_AREAS.map((focusArea) => [focusArea, { done: 0, skipped: 0 }]),
  ) as Record<FocusArea, { done: number; skipped: number }>;
}

export async function addFirestoreCheckin(
  db: Firestore,
  input: CheckinInput,
  scopeKey: string,
) {
  const payload: FirestoreCheckinDoc = {
    ...input,
    date: toDateOnly(input.date),
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, "users", scopeKey, "checkins"), payload);
}

export async function getFirestoreWeeklySummary(
  db: Firestore,
  endDateInput: string | undefined,
  scopeKey: string,
): Promise<WeeklySummary> {
  const endDate = new Date(toDateOnly(endDateInput));
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  const startKey = startDate.toISOString().slice(0, 10);
  const endKey = endDate.toISOString().slice(0, 10);

  const q = query(
    collection(db, "users", scopeKey, "checkins"),
    where("date", ">=", startKey),
    where("date", "<=", endKey),
  );

  const snapshot = await getDocs(q);
  const byFocus = createFocusSummary();

  let done = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const item = doc.data() as FirestoreCheckinDoc;
    if (!item.focus || !item.status) {
      continue;
    }

    if (!byFocus[item.focus]) {
      continue;
    }

    byFocus[item.focus][item.status] += 1;
    if (item.status === "done") {
      done += 1;
    } else if (item.status === "skipped") {
      skipped += 1;
    }
  }

  const total = done + skipped;

  return {
    windowStart: startKey,
    windowEnd: endKey,
    total,
    done,
    skipped,
    completionRate: total > 0 ? Number((done / total).toFixed(2)) : 0,
    byFocus,
  };
}