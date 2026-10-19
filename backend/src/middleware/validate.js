/** Parses a value with a zod schema; ZodErrors become 422 in the error handler. */
export const parse = (schema, value) => schema.parse(value ?? {})

function hasOperatorKey(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return false
  for (const [key, inner] of Object.entries(value)) {
    if (key.startsWith('$')) return true
    if (hasOperatorKey(inner, depth + 1)) return true
  }
  return false
}

/** Rejects Mongo operator injection (`{"$ne": null}`) anywhere in user-controlled input. */
export function rejectOperatorKeys(req, res, next) {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query)) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request.' }, requestId: req.id })
  }
  next()
}
