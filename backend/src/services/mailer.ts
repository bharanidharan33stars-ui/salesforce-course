import fs from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env, smtpConfigured } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Outbound e-mail.
 *
 * Two modes, selected by configuration:
 *  - smtp        : real delivery through the configured SMTP provider.
 *  - stream (dev): nothing leaves the machine. The rendered message is written
 *                  to backend/storage/mail/*.eml so you can open it in an
 *                  e-mail client while developing.
 *
 * `accepted` is true only when a transport confirmed the message. The caller
 * records exactly what happened in the email_logs table.
 */

// Same principle as certificate storage: on Vercel fall back to /tmp so a
// read-only root filesystem can never break certificate issuance.
const MAIL_DIR = process.env.MAIL_STORAGE_DIR
  ? path.resolve(process.env.MAIL_STORAGE_DIR)
  : process.env.VERCEL
    ? "/tmp/sla-mail"
    : path.resolve(__dirname, "../../storage/mail");

export interface SendResult {
  accepted: boolean;
  simulated: boolean;
  messageId?: string;
  filePath?: string;
  error?: string;
}

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;
  if (smtpConfigured) {
    cachedTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      pool: true,
      maxConnections: 3,
    });
  } else {
    // Development transport: keeps bytes in memory / writes them to disk.
    cachedTransport = nodemailer.createTransport({ jsonTransport: true });
  }
  return cachedTransport;
}

export function resetTransportCache(): void {
  cachedTransport = null;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export async function sendMail(message: MailMessage): Promise<SendResult> {
  try {
    if (!smtpConfigured) {
      // Simulated delivery: persist the message so it can be inspected.
      fs.mkdirSync(MAIL_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(MAIL_DIR, `${stamp}-${message.to.replace(/[^a-z0-9]+/gi, "_")}.eml`);
      const info = await getTransport().sendMail({
        from: env.SMTP_FROM,
        ...message,
      });
      const eml = [
        `From: ${env.SMTP_FROM}`,
        `To: ${message.to}`,
        `Subject: ${message.subject}`,
        `Date: ${new Date().toUTCString()}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        message.html,
      ].join("\r\n");
      fs.writeFileSync(filePath, eml, "utf8");
      logger.info("Development mail captured (not sent)", { to: message.to, filePath });
      return { accepted: true, simulated: true, filePath, messageId: info.messageId };
    }

    const info = await getTransport().sendMail({ from: env.SMTP_FROM, ...message });
    const accepted = (info.accepted?.length ?? 0) > 0;
    return {
      accepted,
      simulated: false,
      messageId: info.messageId,
      error: accepted ? undefined : "The SMTP provider did not accept the message.",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown e-mail error";
    logger.error("E-mail delivery failed", { to: message.to, error: detail });
    return { accepted: false, simulated: false, error: detail };
  }
}

// ------------------------------------------------------------- templates

const academyStyles = `
  body{font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#192B43;line-height:1.6;}
  .wrap{max-width:560px;margin:0 auto;padding:24px;}
  .brand{background:#1675D1;color:#fff;padding:16px 24px;border-radius:10px 10px 0 0;font-weight:700;letter-spacing:.4px;}
  .body{background:#fff;border:1px solid #E2EAF3;border-top:none;padding:24px;border-radius:0 0 10px 10px;}
  .btn{display:inline-block;background:#1675D1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;margin:18px 0;font-weight:600;}
  .muted{color:#65758B;font-size:13px;}
  .code{font-family:Consolas,monospace;background:#F6F9FD;border:1px solid #E2EAF3;padding:10px 14px;border-radius:8px;display:inline-block;}
`;

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F6F9FD;">
    <div class="wrap">
      <div class="brand">${env.SMTP_FROM.match(/^"?([^"<]+)/)?.[1]?.trim() || "Salesforce Learning Academy"}</div>
      <div class="body">
        <h2 style="margin-top:0;color:#12243A;">${title}</h2>
        ${inner}
        <p class="muted">Academy-issued course-completion certificate. This is not an official Salesforce certification.</p>
      </div>
    </div>
    <style>${academyStyles}</style>
  </body></html>`;
}

export function verificationEmail(input: { name: string; url: string; expiresInHours: number }): MailMessage {
  const subject = "Verify your e-mail address";
  const text = `Hello ${input.name},\n\nPlease confirm your e-mail address by opening this link:\n${input.url}\n\nThe link expires in ${input.expiresInHours} hours.\n\nSalesforce Learning Academy`;
  const html = shell(
    "Confirm your e-mail address",
    `<p>Hello ${input.name},</p>
     <p>Please confirm the e-mail address for your Salesforce Learning Academy account.</p>
     <p><a class="btn" href="${input.url}">Verify my e-mail</a></p>
     <p class="muted">Or paste this link into your browser:<br>${input.url}</p>
     <p class="muted">This link expires in ${input.expiresInHours} hours.</p>`,
  );
  return { to: "", subject, text, html };
}

export function passwordResetEmail(input: { name: string; url: string; expiresInMinutes: number }): MailMessage {
  const subject = "Reset your password";
  const text = `Hello ${input.name},\n\nA password reset was requested for your account.\nOpen this link to choose a new password:\n${input.url}\n\nThe link expires in ${input.expiresInMinutes} minutes.\n\nIf you did not request this, you can safely ignore this message.\n\nSalesforce Learning Academy`;
  const html = shell(
    "Reset your password",
    `<p>Hello ${input.name},</p>
     <p>A password reset was requested for your Salesforce Learning Academy account.</p>
     <p><a class="btn" href="${input.url}">Choose a new password</a></p>
     <p class="muted">Or paste this link into your browser:<br>${input.url}</p>
     <p class="muted">This link expires in ${input.expiresInMinutes} minutes. If you did not request it, ignore this message.</p>`,
  );
  return { to: "", subject, text, html };
}

export function certificateEmail(input: {
  name: string;
  courseTitle: string;
  certificateNumber: string;
  completionDate: string;
  dashboardUrl: string;
  verifyUrl: string;
}): MailMessage {
  const subject = "Congratulations! Your Salesforce Course Certificate";
  const text = `Hello ${input.name},\n\nCongratulations on completing the ${input.courseTitle} course!\n\nYou have completed the required lessons and assessments. Your course-completion certificate is attached to this email or available through your student dashboard.\n\nCertificate ID: ${input.certificateNumber}\nCompletion Date: ${input.completionDate}\n\nVerify this certificate: ${input.verifyUrl}\nOpen your dashboard: ${input.dashboardUrl}\n\nThank you for learning with Salesforce Learning Academy.\n\nBest regards,\nSalesforce Learning Academy`;
  const html = shell(
    "Congratulations! Your certificate is ready",
    `<p>Hello ${input.name},</p>
     <p>Congratulations on completing the <strong>${input.courseTitle}</strong> course!</p>
     <p>You have completed the required lessons and assessments. Your course-completion certificate is attached to this email and is also available from your student dashboard.</p>
     <table style="border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:6px 14px;color:#65758B;">Certificate ID</td><td style="padding:6px 14px;"><span class="code">${input.certificateNumber}</span></td></tr>
       <tr><td style="padding:6px 14px;color:#65758B;">Completion date</td><td style="padding:6px 14px;">${input.completionDate}</td></tr>
     </table>
     <p><a class="btn" href="${input.dashboardUrl}">Open my dashboard</a> <a class="btn" href="${input.verifyUrl}" style="background:#12243A;">Verify certificate</a></p>
     <p class="muted">Thank you for learning with Salesforce Learning Academy.</p>`,
  );
  return { to: "", subject, text, html };
}

export function isSimulatedDelivery(): boolean {
  return !smtpConfigured;
}
