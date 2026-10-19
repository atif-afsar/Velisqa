/**
 * Which integrations are switched on, based on backend/.env. Never prints secret values.
 *
 *   npm run check:integrations
 *
 * For a live Razorpay test-mode check afterwards: npm run check:razorpay
 */
import { env } from '../src/config/env.js'

const INTEGRATIONS = [
  ['Database', ['MONGODB_URI'], 'required'],
  ['Session security', ['SESSION_SECRET', 'CSRF_SECRET', 'ORDER_TOKEN_SECRET'], 'required in production'],
  ['Razorpay payments', ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], 'online payments; otherwise COD only'],
  ['Razorpay webhook', ['RAZORPAY_WEBHOOK_SECRET'], 'confirms payments if the shopper closes the tab'],
  ['NimbusPost shipping', ['NIMBUSPOST_API_KEY|NIMBUSPOST_API_TOKEN|NIMBUSPOST_EMAIL', 'NIMBUSPOST_WAREHOUSE_ID'], 'book AWBs from admin'],
  ['NimbusPost pickup address', ['NIMBUSPOST_PICKUP_NAME', 'NIMBUSPOST_PICKUP_PHONE', 'NIMBUSPOST_PICKUP_ADDRESS', 'NIMBUSPOST_PICKUP_PINCODE'], 'needed by some NimbusPost accounts'],
  ['NimbusPost tracking webhook', ['NIMBUSPOST_WEBHOOK_SECRET'], 'live delivery status updates'],
  ['Meta Conversions API', ['META_PIXEL_ID', 'META_CONVERSIONS_API_TOKEN'], 'server-side Purchase events'],
  ['Google sign-in', ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'], '"Continue with Google"'],
  ['Cloudinary uploads', ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], 'optional; else images saved on the server'],
  ['Password-reset email', ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'], 'reset links by email'],
  ['AI product drafts', ['ANTHROPIC_API_KEY'], 'optional; bulk upload from photos'],
]

const has = (key) => key.split('|').some((name) => Boolean(String(env[name] ?? '').trim()))
const rows = INTEGRATIONS.map(([name, keys, purpose]) => {
  const missing = keys.filter((key) => !has(key))
  return { integration: name, status: missing.length ? (missing.length === keys.length ? 'off' : 'INCOMPLETE') : 'on', missing: missing.join(', '), purpose }
})
console.table(rows)

if (env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') && !env.isProd) console.warn('⚠ Live Razorpay key outside production — use rzp_test_ keys for development.')
if (env.NIMBUSPOST_AUTO_SHIP && !env.isProd) console.warn('⚠ NIMBUSPOST_AUTO_SHIP is on: paid orders will book real shipments.')
