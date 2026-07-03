import type { DailyPlan } from "@/lib/plan";

export function buildReminderMailtoHref(plan: DailyPlan, email: string): string {
  const subject = encodeURIComponent(`Your ${plan.minutes}-minute ${plan.focus} plan is ready`);
  const body = encodeURIComponent(
    [
      `Focus: ${plan.focus}`,
      `Dose: ${plan.dose}`,
      `Time: ${plan.minutes} minutes`,
      "",
      `Action: ${plan.action}`,
      `Reflection: ${plan.reflection}`,
      "",
      "You set the dose. We deliver exactly that amount.",
    ].join("\n"),
  );

  return `mailto:${email}?subject=${subject}&body=${body}`;
}
