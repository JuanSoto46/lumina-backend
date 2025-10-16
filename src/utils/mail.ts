import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, html: string) {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const transporter = nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } });
  await transporter.verify();
  await transporter.sendMail({
    from: `Lumina <${user}>`,
    to, subject, html
  });
}
