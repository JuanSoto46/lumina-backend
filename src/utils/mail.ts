/**
 * @fileoverview Utility module for sending transactional emails using SendGrid.
 * 
 * This module initializes the SendGrid client and exposes a helper function `sendMail`
 * to send emails with HTML and plain text content.
 * 
 * Environment variables required:
 * - `SENDGRID_API_KEY`: API key for SendGrid.
 * - `EMAIL_FROM`: Default "from" address used in outgoing emails.
 * - `REPLY_TO` (optional): Default reply-to address for responses.
 */

import sgMail from "@sendgrid/mail";

let initialized = false;

/**
 * Ensures that the SendGrid client has been properly initialized.
 * 
 * This function checks if the `SENDGRID_API_KEY` environment variable exists,
 * and if the SendGrid client has not been initialized yet, it sets the API key.
 * 
 * @throws {Error} Throws an error if `SENDGRID_API_KEY` is missing.
 */
function ensureInit() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY missing");
  if (!initialized) {
    sgMail.setApiKey(key);
    initialized = true;
  }
}

/**
 * Options for sending an email.
 * 
 * @typedef {Object} SendEmailOpts
 * @property {string} to - The recipient's email address.
 * @property {string} subject - The subject line of the email.
 * @property {string} html - The HTML body of the email.
 * @property {string} [replyTo] - Optional email address for reply-to.
 * @property {string} [text] - Optional plain-text version of the message.
 */
type SendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  text?: string;
};

/**
 * Sends an email using SendGrid.
 * 
 * This function automatically initializes the SendGrid client if not already done.
 * It sends an email with both HTML and plain-text versions and logs the result to the console.
 * 
 * @async
 * @function sendMail
 * @param {SendEmailOpts} options - The email sending options.
 * @returns {Promise<boolean>} Returns `true` if the email was sent successfully.
 * @throws {Error} Throws an error if sending fails or SendGrid responds with an error.
 */
export async function sendMail({ to, subject, html, replyTo, text }: SendEmailOpts) {
  ensureInit();
  const from = process.env.EMAIL_FROM!;
  try {
    const [resp] = await sgMail.send({
      to,
      from,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""), // Fallback to stripped text
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
