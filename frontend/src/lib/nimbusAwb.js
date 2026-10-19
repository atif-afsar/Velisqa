export function isValidAwb(value) {
  if (value == null) return false
  const trimmed = String(value).trim()
  if (!trimmed || trimmed.length < 6 || trimmed.length > 20) return false
  if (/error|proxy|exception|fail|null|undefined|domain|html|http|invalid/i.test(trimmed)) return false
  if (/^\d{6,20}$/.test(trimmed)) return true
  if (/^(NMBC|IN|AWB)\d{6,15}$/i.test(trimmed)) return true
  return false
}

export function effectiveAwb(order) {
  return isValidAwb(order?.nimbuspost_awb) ? order.nimbuspost_awb : null
}
