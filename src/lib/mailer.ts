import nodemailer from "nodemailer";

type ReminderEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      mode: "preview" as const,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    mode: "smtp" as const,
  };
}

export async function sendReminderEmail(input: ReminderEmailInput) {
  const from = process.env.SMTP_FROM ?? "Focus <noreply@example.com>";
  const { transporter, mode } = createTransport();

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return {
    mode,
    messageId: info.messageId,
  };
}
