import { useCallback, useEffect, useState } from 'react'
import { fetchAdminInboxSummary } from '../lib/adminInbox'
import { apiUrl } from '../lib/apiClient'

// Web Audio API Synth Bell Chime (Synthesizes chime offline, no external audio files required)
function playOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    const playNote = (delay, frequency, duration) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.type = 'triangle' // triangular wave for bell-like tone
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration - 0.01)
      
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + duration)
    }
    
    // Play a luxury double-chime bell chord (A5 -> C#6)
    playNote(0, 880.00, 0.4)
    playNote(0.12, 1109.73, 0.6)
  } catch (e) {
    console.warn('Audio chime failed (interaction required first):', e)
  }
}

// Request desktop browser notification permissions
function requestNotificationPermission() {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'default'
  ) {
    void Notification.requestPermission()
  }
}

// Trigger Web Notification alert
function showOrderNotification(order) {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    const ref = order.order_ref || 'N/A'
    const name = order.customer_name || 'Customer'
    const total = order.grand_total ? `₹${order.grand_total}` : 'N/A'
    
    new Notification('New Order Received! 🛍️', {
      body: `Order Ref: ${ref}\nCustomer: ${name}\nTotal: ${total}`,
      icon: '/images/logo.png',
    })
  }
}

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

  // Request browser notification permissions on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Live new-order alerts over Server-Sent Events (replaces Supabase Realtime).
  // EventSource reconnects on its own; the 60s poll below still covers any gap.
  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return undefined
    const source = new EventSource(apiUrl('/admin/events'), { withCredentials: true })
    const onOrder = (event) => {
      try {
        const order = JSON.parse(event.data)
        if (order && !order.is_enquiry) {
          playOrderChime()
          showOrderNotification(order)
          void refresh()
        }
      } catch {
        /* ignore malformed events */
      }
    }
    source.addEventListener('order', onOrder)
    return () => {
      source.removeEventListener('order', onOrder)
      source.close()
    }
  }, [refresh])

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
