import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

const ROTATE_MS = 2000
const START_DELAY_MS = 1000

function awayMessages(itemCount) {
  return [
    '❤️ You left this…',
    itemCount > 0 ? `🛍️ Your bag misses you (${itemCount})` : '✨ Your next favourite is here',
    '💛 Come back to Velisqa',
  ]
}

/**
 * While the shopper is on another tab, the tab title rotates through gentle come-back
 * messages (mentioning their bag when it has items). The Velisqa favicon stays as is.
 * The page title is restored the moment they return. Off on admin pages.
 */
export default function InactiveTabTitle() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()
  const countRef = useRef(itemCount)
  const disabled = pathname.startsWith('/admin')

  useEffect(() => {
    countRef.current = itemCount
  }, [itemCount])

  useEffect(() => {
    if (disabled) return undefined
    let savedTitle = document.title
    let shown = new Set()
    let timer = 0
    let startTimer = 0

    function tick(i) {
      // A page may set its own title while hidden (e.g. after navigation) — keep that one to restore.
      if (!shown.has(document.title)) savedTitle = document.title
      const messages = awayMessages(countRef.current)
      const next = messages[i % messages.length]
      shown.add(next)
      document.title = next
      timer = window.setTimeout(() => tick(i + 1), ROTATE_MS)
    }

    function leave() {
      savedTitle = document.title
      shown = new Set()
      startTimer = window.setTimeout(() => tick(0), START_DELAY_MS)
    }

    function back() {
      window.clearTimeout(startTimer)
      window.clearTimeout(timer)
      if (shown.has(document.title)) document.title = savedTitle
      shown = new Set()
    }

    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back())
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      back()
    }
  }, [disabled])

  return null
}
