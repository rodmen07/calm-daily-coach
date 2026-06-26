import { NextResponse } from "next/server";
import { addCheckin, checkinInputSchema, listRecentCheckins } from "@/lib/checkins";

export async function GET() {
  try {
    const checkins = await listRecentCheckins();
    return NextResponse.json({ checkins });
  } catch {
    return NextResponse.json({ error: "Could not load check-ins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = checkinInputSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid check-in payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const checkin = await addCheckin(parsed.data);
    return NextResponse.json({ checkin }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save check-in" }, { status: 500 });
  }
}
