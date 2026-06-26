import { NextResponse } from "next/server";
import { buildDailyPlan, dailyPlanInputSchema } from "@/lib/plan";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = dailyPlanInputSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid daily plan input", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const plan = buildDailyPlan(parsed.data);

    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate daily plan" },
      { status: 500 },
    );
  }
}
