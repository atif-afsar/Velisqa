import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function navTextClass({ scrolled, onDarkHero, isActive = false }) {
  const size = scrolled
    ? 'text-[0.62rem] tracking-[0.1em]'
    : 'text-[0.72rem] tracking-[0.12em]'

  if (onDarkHero) {
    return `${size} ${isActive ? 'text-[#d4af37]' : 'text-white/75 hover:text-[#f7ead0]'}`
  }

  return `${size} ${isActive ? 'text-[#130006]' : 'text-[#514347]/80 hover:text-[#130006]'}`
}

function AccountIcon({ onDarkHero }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-4 w-4 ${onDarkHero ? 'text-white/90' : 'text-[#130006]'}`}
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5" strokeLinecap="round" />
    </svg>
  )
}

export default function AccountNavMenu({ scrolled, onDarkHero, onNavigate }) {
  const menuId = useId()
  const rootRef = useRef(null)
  const { user, profile, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (loading) return null

  if (!user) {
    return (
      <Link
        to="/login"
        onClick={onNavigate}
        className={`inline-flex min-h-9 items-center whitespace-nowrap font-medium transition-colors duration-200 ${navTextClass({ scrolled, onDarkHero })}`}
      >
        Sign in
      </Link>
    )
  }

  const itemClass = `flex min-h-10 w-full items-center px-3 text-left text-[0.72rem] font-medium tracking-[0.06em] text-[#130006] transition hover:bg-[#f1ede8]`

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={menuId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
          onDarkHero
            ? 'border-white/25 bg-white/5 hover:border-white/45 hover:bg-white/10'
            : 'border-[#130006]/10 bg-white/70 hover:border-[#130006]/25'
        } ${open ? (onDarkHero ? 'border-white/45 bg-white/10' : 'border-[#3d0a21]/25 bg-white') : ''}`}
      >
        <AccountIcon onDarkHero={onDarkHero} />
      </button>

      {open && (
        <div
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 top-[calc(100%+0.45rem)] z-[60] min-w-[11.5rem] overflow-hidden rounded-xl border border-[#d4af37]/20 bg-[#fdf9f4] py-1 shadow-[0_18px_48px_rgba(19,0,6,0.14)]"
        >
          <NavLink
            to="/account/orders"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className={({ isActive }) => `${itemClass} ${isActive ? 'bg-[#f1ede8] font-semibold' : ''}`}
          >
            My orders
          </NavLink>
          {profile?.role === 'admin' && (
            <Link
              to="/admin/panel"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
              className={itemClass}
            >
              Admin dashboard
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
              void logout()
            }}
            className={`${itemClass} border-t border-[#d4af37]/15 text-[#6f334a]`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
