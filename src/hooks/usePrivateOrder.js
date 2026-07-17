import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getManualPaymentOrder } from '../lib/manualPayments'
import { isOrderTerminal } from '../lib/orderTracking'

export function usePrivateOrder() {
  const { orderRef } = useParams()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token') || ''
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!orderRef || !accessToken) {
      setError('This order link is incomplete.')
      setOrder(null)
      setLoading(false)
      return
    }

    if (silent) setRefreshing(true)
    else {
      setLoading(true)
      setError('')
    }

    try {
      const nextOrder = await getManualPaymentOrder(orderRef, accessToken)
      setOrder(nextOrder)
      setError('')
      setLastUpdatedAt(Date.now())
    } catch (err) {
      if (!silent) {
        setError(err?.message || 'Could not load this order.')
        setOrder(null)
      }
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [orderRef, accessToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!order || isOrderTerminal(order)) return undefined

    const timer = window.setInterval(() => {
      void refresh({ silent: true })
    }, 25000)

    return () => window.clearInterval(timer)
  }, [order, refresh])

  return { orderRef, accessToken, order, loading, refreshing, error, lastUpdatedAt, refresh }
}
