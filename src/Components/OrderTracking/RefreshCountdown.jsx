import { useEffect, useState } from 'react'

export default function RefreshCountdown({ intervalMs = 25000, active = true }) {
  const totalSeconds = Math.round(intervalMs / 1000)
  const [remaining, setRemaining] = useState(totalSeconds)

  useEffect(() => {
    if (!active) return undefined

    setRemaining(totalSeconds)
    const timer = window.setInterval(() => {
      setRemaining((current) => (current <= 1 ? totalSeconds : current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [active, totalSeconds])

  const progress = ((totalSeconds - remaining) / totalSeconds) * 100

  return (
    <span className="inline-flex items-center gap-2 text-[#847377]">
      <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden>
        <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" stroke="#d4af37" strokeOpacity="0.25" strokeWidth="2" />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#2d6a4f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 50.27} 50.27`}
          />
        </svg>
      </span>
      <span>Next refresh in {remaining}s</span>
    </span>
  )
}
