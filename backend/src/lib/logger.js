import { env } from '../config/env.js'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[env.LOG_LEVEL] ?? 20

const SECRET_KEYS = /pass(word)?|secret|token|authorization|cookie|signature|utr|api[-_]?key|email|phone|address/i

/** Recursively masks values whose key looks sensitive so logs never carry PII or credentials. */
export function redact(value, depth = 0) {
  if (value == null || depth > 4) return value
  if (value instanceof Error) return { name: value.name, message: value.message, status: value.status }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1))
  if (typeof value !== 'object') return value
  const out = {}
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SECRET_KEYS.test(key) ? '[redacted]' : redact(inner, depth + 1)
  }
  return out
}

function write(level, message, meta) {
  if (LEVELS[level] < threshold || env.isTest) return
  const line = { time: new Date().toISOString(), level, message, ...(meta ? redact(meta) : {}) }
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  stream.write(`${JSON.stringify(line)}\n`)
}

export const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}
