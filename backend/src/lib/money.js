/**
 * Money is computed in integer paise and stored/serialized as rupees with at
 * most two decimals, matching the numeric(12,2) columns in the old schema.
 */
export const toPaise = (rupees) => Math.round((Number(rupees) || 0) * 100)
export const toRupees = (paise) => Math.round(Number(paise) || 0) / 100

/** Round a paise amount to whole rupees (Postgres `round(x, 0)` → half away from zero). */
export function roundPaiseToRupee(paise) {
  const sign = paise < 0 ? -1 : 1
  return sign * Math.round(Math.abs(paise) / 100) * 100
}

export const normalizeRupees = (value) => toRupees(toPaise(value))
