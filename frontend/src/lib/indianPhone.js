export function normalizeIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(-10)
  return null
}

export function validateIndianPhone(value) {
  const normalized = normalizeIndianPhone(value)
  if (!normalized) {
    return {
      ok: false,
      message: 'Enter a valid 10-digit Indian mobile number (for example 9876543210).',
    }
  }
  return { ok: true, phone: normalized }
}
