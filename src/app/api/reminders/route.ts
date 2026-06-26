import { NextResponse } from "next/server";
import { z } from "zod";
import { sendReminderEmail } from "@/lib/mailer";

const reminderRequestSchema = z.object({
  email: z.string().email(),
  focus: z.string().min(1),
  dose: z.enum(["light", "medium", "deep"]),
  action: z.string().min(1),
  minutes: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = reminderRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, focus, dose, action, minutes } = parsed.data;

    const result = await sendReminderEmail({
      to: email,
      subject: `Your ${minutes}-minute ${focus} plan is ready`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;max-width:560px;margin:0 auto;padding:12px;">
          <h2 style="margin-bottom:8px;">Today's deliberate dose</h2>
          <p style="margin-top:0;color:#444;">Focus: <strong>${focus}</strong> | Dose: <strong>${dose}</strong> | Time: <strong>${minutes} minutes</strong></p>
          <p>${action}</p>
          <p style="margin-top:20px;color:#666;">You set the dose. We deliver exactly that amount.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, delivery: result.mode, messageId: result.messageId });
  } catch {
    return NextResponse.json(
      { error: "Failed to send reminder email" },
      { status: 500 },
    );
  }
}
