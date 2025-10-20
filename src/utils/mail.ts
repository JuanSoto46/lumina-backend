// src/utils/mail.ts
import sgMail from "@sendgrid/mail";

let initialized = false;

function ensureInit() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY missing");
  if (!initialized) {
    sgMail.setApiKey(key);
    initialized = true;
  }
}

type SendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  text?: string;
};

export async function sendMail({ to, subject, html, replyTo, text }: SendEmailOpts) {
  ensureInit();
  const from = process.env.EMAIL_FROM!;
  try {
    const [resp] = await sgMail.send({
      to,
      from,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
      replyTo: replyTo || process.env.REPLY_TO || from,
    });
    console.log("[sendMail] ok", {
      to,
      status: resp.statusCode,
      requestId: resp.headers["x-message-id"] || resp.headers["x-request-id"],
    });
    return true;
  } catch (err: any) {
    const status = err?.code || err?.response?.statusCode;
    const body = err?.response?.body;
    console.error("[sendMail] fail", {
      to,
      status,
      body: body ? JSON.stringify(body, null, 2) : err?.message,
    });
    throw new Error(
      body?.errors?.[0]?.message ||
      body?.message ||
      err?.message ||
      "Email service error"
    );
  }
}
