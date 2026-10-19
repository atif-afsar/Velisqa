/**
 * Accepts only same-site relative paths ("/checkout?x=1"). Rejects absolute
 * URLs, protocol-relative "//evil.com", backslash tricks and control chars.
 */
export function safeRelativePath(value, fallback = '/') {
  if (typeof value !== 'string') return fallback
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f\\]/.test(path) || path.length > 512) return fallback
  try {
    const parsed = new URL(path, 'https://placeholder.invalid')
    if (parsed.origin !== 'https://placeholder.invalid') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
