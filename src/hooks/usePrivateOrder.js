import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getManualPaymentOrder } from '../lib/manualPayments'

export function usePrivateOrder() {
  const { orderRef } = useParams()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token') || ''
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setOrder(await getManualPaymentOrder(orderRef, accessToken))
    } catch (err) {
      setError(err?.message || 'Could not load this order.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getManualPaymentOrder(orderRef, accessToken)
      .then((nextOrder) => {
        if (cancelled) return
        setOrder(nextOrder)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Could not load this order.')
        setOrder(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orderRef, accessToken])

  return { orderRef, accessToken, order, loading, error, refresh }
}
