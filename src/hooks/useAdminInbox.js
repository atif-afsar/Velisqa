import { useCallback, useEffect, useState } from 'react'
import { fetchAdminInboxSummary } from '../lib/adminInbox'

export function useAdminInbox({ pollMs = 60000 } = {}) {
  const [inbox, setInbox] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      setInbox(await fetchAdminInboxSummary())
    } catch (err) {
      setError(err?.message || 'Could not load admin inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAdminInboxSummary()
      .then((data) => {
        if (!cancelled) {
          setInbox(data)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load admin inbox.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pollMs) return undefined
    const timer = window.setInterval(() => {
      void refresh()
    }, pollMs)
    return () => window.clearInterval(timer)
  }, [pollMs, refresh])

  return { inbox, loading, error, refresh }
}
