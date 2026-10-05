import "server-only";
import { Resend } from "resend";
import type { NotificationType } from "@/lib/notify";

export interface SendResult {
  delivered: boolean;
}

let resend: Resend | null | undefined;

function getClient(): Resend | null {
  if (resend !== undefined) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    warnOnce(
      "RESEND_API_KEY not set — emails are logged to the server console instead of being sent (fine for local dev, required before staging)."
    );
    resend = null;
  } else {
    resend = new Resend(key);
  }
  return resend;
}

function fromAddress(): string {
  // `||` not `??`: an empty EMAIL_FROM= in .env.local must fall back too.
  return process.env.EMAIL_FROM?.trim() || "App <onboarding@resend.dev>";
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function layout(title: string, heading: string, bodyHtml: string, footNote?: string): string {
  const footer =
    footNote ??
    `${title} — if you didn't request this, you can safely ignore this email.`;
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #111;">
    <div style="max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px;">${heading}</h2>
      ${bodyHtml}
      <p style="color: #666; font-size: 12px; margin-top: 32px;">${footer}</p>
    </div>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<p><a href="${url}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px;">${label}</a></p>
  <p style="color: #666; font-size: 13px;">Or paste this link into your browser:<br/><a href="${url}">${url}</a></p>`;
}

async function send(to: string, subject: string, html: string, devLink: string): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    console.log(`[email:dev] to=${to} subject="${subject}" link=${devLink}`);
    return { delivered: false };
  }
  const { error } = await client.emails.send({ from: fromAddress(), to, subject, html });
  if (error) {
    console.error(`[email] send failed to=${to}: ${error.name} ${error.message}`);
    return { delivered: false };
  }
  return { delivered: true };
}

export async function sendVerificationEmail(to: string, rawToken: string): Promise<SendResult> {
  const url = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
  return send(
    to,
    "Verify your email address",
    layout(
      "Email verification",
      "Confirm your email",
      `<p>Welcome! Please confirm your email address to activate your account.</p>${button(url, "Verify email")}`
    ),
    url
  );
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<SendResult> {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return send(
    to,
    "Reset your password",
    layout(
      "Password reset",
      "Reset your password",
      `<p>We received a request to reset your password. The link is valid for 30 minutes.</p>${button(url, "Reset password")}`
    ),
    url
  );
}

let warned = false;
function warnOnce(msg: string): void {
  if (warned) return;
  warned = true;
  console.warn(`[email] ${msg}`);
}

const NOTIFICATION_COPY: Record<
  NotificationType,
  { subject: string; heading: string; body: string; url: string; cta: string }
> = {
  post_ready: {
    subject: "Your AI-drafted post is ready",
    heading: "Post ready for review",
    body: "<p>We finished drafting your next Google post. Give it a look and publish when you're happy with it.</p>",
    url: `${appUrl()}/dashboard`,
    cta: "Review the post",
  },
  post_failed: {
    subject: "A post failed to publish",
    heading: "Post publish failed",
    body: "<p>One of your posts couldn't be published to Google. Open your dashboard to review and retry.</p>",
    url: `${appUrl()}/dashboard`,
    cta: "Open dashboard",
  },
  token_expired: {
    subject: "Reconnect your Google account",
    heading: "Google connection expired",
    body: "<p>Your Google Business Profile connection needs to be refreshed. Reconnect to keep reviews, posts and QR codes flowing.</p>",
    url: `${appUrl()}/dashboard/settings`,
    cta: "Reconnect",
  },
  payment_failed: {
    subject: "Your payment failed",
    heading: "Payment failed",
    body: "<p>We couldn't process your last payment. Update your billing details to keep your plan active.</p>",
    url: `${appUrl()}/dashboard/billing`,
    cta: "Open billing",
  },
};

export async function sendNotificationEmail(
  to: string,
  type: NotificationType
): Promise<SendResult> {
  const copy = NOTIFICATION_COPY[type];
  if (!copy) return { delivered: false };
  return send(
    to,
    copy.subject,
    layout(
      "Notification",
      copy.heading,
      `${copy.body}${button(copy.url, copy.cta)}`,
      "You're receiving this because notification emails are enabled in your settings."
    ),
    copy.url
  );
}
