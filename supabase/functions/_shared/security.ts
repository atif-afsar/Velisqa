import { timingSafeEqual } from 'node:crypto'

/** Constant-time string comparison (avoids leaking secrets through response timing). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** Message safe to return to the browser; details stay in function logs. */
export function publicErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.name === 'PublicError') return error.message
  return fallback
}

export class PublicError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicError'
  }
}
