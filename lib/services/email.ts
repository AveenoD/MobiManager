import { Resend } from 'resend';
import { getEnv } from '@/lib/env';

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

function getResendClient(): Resend | null {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return null;
  return new Resend(env.RESEND_API_KEY);
}

export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export async function sendEmail(args: SendEmailArgs): Promise<{ id: string } | null> {
  const env = getEnv();
  const client = getResendClient();
  if (!client) return null;
  if (!env.RESEND_FROM_EMAIL) return null;

  const replyTo = args.replyTo || env.RESEND_REPLY_TO_EMAIL || undefined;

  const res = await client.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: replyTo ? [replyTo] : undefined,
  });

  if (res.error) {
    throw new Error(res.error.message);
  }

  return res.data?.id ? { id: res.data.id } : null;
}

export async function sendAdminRegistrationReceivedEmail(params: { to: string; shopName: string }) {
  return sendEmail({
    to: params.to,
    subject: 'MobiManager: Registration received',
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5">
        <p>Hi,</p>
        <p>We received your registration for <b>${escapeHtml(params.shopName)}</b>.</p>
        <p>Please upload your documents to complete verification.</p>
        <p>Thanks,<br/>MobiManager Team</p>
      </div>
    `,
  });
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

