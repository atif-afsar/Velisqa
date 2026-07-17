import { useCallback, useEffect, useState } from 'react'
import { fetchOrderLiveTracking } from '../lib/manualPayments'

export function useLiveTracking({ orderRef, accessToken, awbNumber, enabled }) {
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !orderRef || !accessToken || !awbNumber) return

    if (!silent) setLoading(true)
    setError('')

    const { data, error: invokeError } = await fetchOrderLiveTracking(orderRef, accessToken)
    if (invokeError) {
      if (!silent) setError(invokeError)
    } else {
      setTracking(data?.tracking || null)
    }

    if (!silent) setLoading(false)
  }, [enabled, orderRef, accessToken, awbNumber])

  useEffect(() => {
    if (!enabled || !awbNumber) {
      setTracking(null)
      return undefined
    }

    void refresh()
    const timer = window.setInterval(() => {
      void refresh({ silent: true })
    }, 45000)

    return () => window.clearInterval(timer)
  }, [enabled, awbNumber, refresh])

  return { tracking, loading, error, refresh }
}

export function useTrackingEnabled(order) {
  return Boolean(order?.awbNumber && order.orderStatus !== 'cancelled')
}
