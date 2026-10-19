import { useCallback, useEffect, useState } from 'react'
import { clearAppliedCoupon, readAppliedCoupon, saveAppliedCoupon, validateCoupon } from '../lib/coupons'

/**
 * Applied coupon shared by the cart and checkout (persisted in localStorage).
 * Re-validates against the database whenever the subtotal changes.
 */
export function useCoupon(subtotal) {
  const [code, setCode] = useState(readAppliedCoupon)
  const [discount, setDiscount] = useState(0)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!code) {
      queueMicrotask(() => setDiscount(0))
      return undefined
    }
    let cancelled = false
    validateCoupon(code, subtotal).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDiscount(result.discount)
        saveAppliedCoupon(result.code, result.discount)
      } else {
        setCode('')
        setDiscount(0)
        clearAppliedCoupon()
      }
    })
    return () => {
      cancelled = true
    }
  }, [code, subtotal])

  const apply = useCallback(
    async (input) => {
      setError('')
      setChecking(true)
      const result = await validateCoupon(input, subtotal)
      setChecking(false)
      if (!result.ok) {
        setError(result.error)
        return false
      }
      setCode(result.code)
      setDiscount(result.discount)
      saveAppliedCoupon(result.code, result.discount)
      return true
    },
    [subtotal],
  )

  const remove = useCallback(() => {
    setCode('')
    setDiscount(0)
    setError('')
    clearAppliedCoupon()
  }, [])

  return { code, discount, error, checking, apply, remove }
}
