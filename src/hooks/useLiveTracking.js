import { useCallback, useEffect, useState } from 'react'
import { fetchOrderLiveTracking } from '../lib/manualPayments'

const LIVE_TRACKING_POLL_MS = 25000

export function useLiveTracking({ orderRef, accessToken, awbNumber, enabled }) {
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !orderRef || !accessToken || !awbNumber) return
    if (typeof document !== 'undefined' && document.hidden) return

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

    function startPolling() {
      return window.setInterval(() => {
        if (document.hidden) return
        void refresh({ silent: true })
      }, LIVE_TRACKING_POLL_MS)
    }

    let timer = startPolling()

    function handleVisibilityChange() {
      if (document.hidden) return
      void refresh({ silent: true })
      window.clearInterval(timer)
      timer = startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, awbNumber, refresh])

  return { tracking, loading, error, refresh }
}

export function useTrackingEnabled(order) {
  return Boolean(order?.awbNumber && order.orderStatus !== 'cancelled')
}
