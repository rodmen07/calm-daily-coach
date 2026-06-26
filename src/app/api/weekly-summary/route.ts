import { NextResponse } from "next/server";
import { getWeeklySummary } from "@/lib/checkins";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endDate = searchParams.get("endDate") ?? undefined;
    const summary = await getWeeklySummary(endDate);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Could not load weekly summary" }, { status: 500 });
  }
}
