import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

let transport = null

export function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM)
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

/** Sends a transactional email over SMTP (e.g. Hostinger mail). Returns false when SMTP is not configured. */
export async function sendEmail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    logger.warn('Email not sent: SMTP is not configured', { subject })
    return false
  }
  await getTransport().sendMail({ from: env.EMAIL_FROM, to, subject, text, html })
  return true
}
