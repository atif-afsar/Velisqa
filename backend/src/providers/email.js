import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { ProviderError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

const RESEND_URL = 'https://api.resend.com/emails'
const REQUEST_TIMEOUT_MS = 15_000

let transport = null

// Overridable in tests so no real HTTP call is ever made.
let fetchImpl = (...args) => fetch(...args)
export const setEmailFetch = (fn) => {
  fetchImpl = fn
}

const hasResend = () => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)
const hasSmtp = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM)

export function isEmailConfigured() {
  return hasResend() || hasSmtp()
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  }
  return transport
}

async function sendViaResend({ to, subject, text, html, headers, idempotencyKey }) {
  const response = await fetchImpl(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html, headers }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ProviderError(`Resend rejected the email (${response.status}): ${body?.message || body?.name || 'unknown error'}`, 502)
  }
}

/**
 * Sends a transactional/marketing email. Resend (HTTPS API) is used when RESEND_API_KEY is set,
 * otherwise SMTP. Returns false when no provider is configured.
 */
export async function sendEmail({ to, subject, text, html, headers, idempotencyKey }) {
  if (hasResend()) {
    await sendViaResend({ to, subject, text, html, headers, idempotencyKey })
    return true
  }
  if (hasSmtp()) {
    await getTransport().sendMail({ from: env.EMAIL_FROM, to, subject, text, html, headers })
    return true
  }
  logger.warn('Email not sent: no email provider is configured', { subject })
  return false
}
