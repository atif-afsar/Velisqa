import 'dotenv/config'
import { z } from 'zod'

const bool = (fallback) =>
  z
    .string()
    .optional()
    .transform((value) => (value == null || value === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())))

const optional = z.string().optional().transform((value) => (value ? value.trim() : ''))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('127.0.0.1'),
  PUBLIC_API_ORIGIN: z.string().default('http://localhost:5000'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_ALLOWED_ORIGINS: optional,
  TRUST_PROXY: z.string().default('loopback'),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/velisqa?replicaSet=rs0'),
  MONGODB_DB_NAME: z.string().default('velisqa'),

  SESSION_SECRET: z.string().default(''),
  CSRF_SECRET: optional,
  ORDER_TOKEN_SECRET: optional,
  COOKIE_NAME: z.string().default('velisqa.sid'),
  COOKIE_DOMAIN: optional,
  COOKIE_SECURE: bool(false),
  SESSION_TTL_DAYS: z.coerce.number().positive().default(14),

  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GOOGLE_REDIRECT_URI: optional,

  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,

  NIMBUSPOST_API_MODE: z.string().default('v2'),
  NIMBUSPOST_AUTO_SHIP: bool(true),
  NIMBUSPOST_EMAIL: optional,
  NIMBUSPOST_PASSWORD: optional,
  NIMBUSPOST_API_KEY: optional,
  NIMBUSPOST_API_TOKEN: optional,
  NIMBUSPOST_API_SECRET: optional,
  NIMBUSPOST_CREATE_SHIPMENT_URL: optional,
  NIMBUSPOST_CANCEL_SHIPMENT_URL: optional,
  NIMBUSPOST_WEBHOOK_SECRET: optional,
  NIMBUSPOST_WEBHOOK_ALLOW_QUERY_SECRET: bool(false),
  NIMBUSPOST_WAREHOUSE_ID: optional,
  NIMBUSPOST_DEFAULT_STATE: optional,
  NIMBUSPOST_PICKUP_NAME: optional,
  NIMBUSPOST_PICKUP_PHONE: optional,
  NIMBUSPOST_PICKUP_ADDRESS: optional,
  NIMBUSPOST_PICKUP_CITY: optional,
  NIMBUSPOST_PICKUP_STATE: optional,
  NIMBUSPOST_PICKUP_PINCODE: optional,
  NIMBUSPOST_PACKAGE_WEIGHT_GRAMS: optional,
  NIMBUSPOST_PACKAGE_LENGTH_CM: optional,
  NIMBUSPOST_PACKAGE_WIDTH_CM: optional,
  NIMBUSPOST_PACKAGE_HEIGHT_CM: optional,

  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,

  META_PIXEL_ID: optional,
  META_CONVERSIONS_API_TOKEN: optional,
  META_GRAPH_API_VERSION: z.string().default('v23.0'),
  META_TEST_EVENT_CODE: optional,

  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: bool(true),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  EMAIL_FROM: optional,

  ANTHROPIC_API_KEY: optional,
  MEDIA_DIR: optional,

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

function load() {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Invalid backend environment: ${issues}`)
  }
  const env = parsed.data
  const isProd = env.NODE_ENV === 'production'

  if (isProd) {
    const missing = ['SESSION_SECRET', 'CSRF_SECRET', 'ORDER_TOKEN_SECRET'].filter((key) => (env[key] || '').length < 32)
    if (missing.length) {
      throw new Error(`Production requires 32+ character secrets for: ${missing.join(', ')}`)
    }
  } else {
    // Dev/test defaults so the API boots without a secrets file; never used in production.
    env.SESSION_SECRET ||= 'dev-only-session-secret-change-me-0000000000'
    env.CSRF_SECRET ||= 'dev-only-csrf-secret-change-me-00000000000000'
    env.ORDER_TOKEN_SECRET ||= 'dev-only-order-token-secret-change-me-000000'
  }

  const origins = new Set(
    [env.FRONTEND_ORIGIN, ...env.CORS_ALLOWED_ORIGINS.split(',')]
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )

  return Object.freeze({
    ...env,
    isProd,
    isTest: env.NODE_ENV === 'test',
    allowedOrigins: [...origins],
    cookieSecure: isProd || env.COOKIE_SECURE,
    frontendOrigin: env.FRONTEND_ORIGIN.replace(/\/$/, ''),
    apiOrigin: env.PUBLIC_API_ORIGIN.replace(/\/$/, ''),
  })
}

export const env = load()
