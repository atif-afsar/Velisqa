import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function AccountIcon({ onDarkHero, open = false }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`
        transition-transform
        duration-300
        ${open ? 'scale-[0.94]' : ''}
        ${onDarkHero ? 'text-white' : 'text-[#1b0b12]'}
      `}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.35" />
      <path d="M5.5 20c1.05-3.15 3.25-4.85 6.5-4.85s5.45 1.7 6.5 4.85" />
    </svg>
  )
}

function ChevronIcon({ open, onDarkHero }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`
        ml-1
        transition-transform
        duration-300
        ${open ? 'rotate-180' : ''}
        ${
          onDarkHero
            ? 'text-white/60'
            : 'text-[#1b0b12]/45'
        }
      `}
      aria-hidden="true"
    >
      <path d="M2 3.5 5 6.5 8 3.5" />
    </svg>
  )
}

function AccountLabel({ onDarkHero }) {
  return (
    <span
      className={`
        mt-1
        hidden
        text-[8px]
        font-semibold
        uppercase
        tracking-[0.13em]
        md:block
        ${
          onDarkHero
            ? 'text-white/75'
            : 'text-[#514347]'
        }
      `}
    >
      Account
    </span>
  )
}

export default function AccountNavMenu({
  scrolled,
  onDarkHero,
  onNavigate,
  variant = 'icon',
}) {
  const menuId = useId()
  const rootRef = useRef(null)

  const { user, profile, loading, logout } =
    useAuth()

  const [open, setOpen] = useState(false)

  const isLabelled = variant === 'labelled'
  const isPlain =
    variant === 'plain' || isLabelled

  // ------------------------------------------------------------
  // CLOSE MENU WHEN CLICKING OUTSIDE / ESCAPE
  // ------------------------------------------------------------

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (
        !rootRef.current?.contains(
          event.target,
        )
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown,
    )

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [open])

  // ------------------------------------------------------------
  // CLOSE ON SCROLL
  // ------------------------------------------------------------

  useEffect(() => {
    if (!open) return undefined

    function handleScroll() {
      setOpen(false)
    }

    window.addEventListener(
      'scroll',
      handleScroll,
      { passive: true },
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      )
    }
  }, [open])

  // ------------------------------------------------------------
  // NOT LOGGED IN
  // ------------------------------------------------------------

  if (loading) return null

  if (!user) {
    return (
      <Link
        to="/login"
        onClick={onNavigate}
        aria-label="Sign in"
        className={`
          group
          inline-flex
          flex-col
          items-center
          justify-center
          transition-opacity
          duration-200
          hover:opacity-60

          ${
            isLabelled
              ? 'min-h-11 px-2'
              : isPlain
                ? 'h-10 w-10'
                : 'h-10 w-10'
          }
        `}
      >
        <AccountIcon
          onDarkHero={onDarkHero}
        />

        {isLabelled && (
          <AccountLabel
            onDarkHero={onDarkHero}
          />
        )}
      </Link>
    )
  }

  // ------------------------------------------------------------
  // MENU ITEM
  // ------------------------------------------------------------

  const itemClass = `
    flex
    min-h-[42px]
    w-full
    items-center
    px-4
    text-left
    text-[11px]
    font-medium
    tracking-[0.025em]
    text-[#2a151d]
    transition-colors
    duration-200
    hover:bg-[#f7f3ee]
  `

  // ------------------------------------------------------------
  // LOGGED-IN ACCOUNT
  // ------------------------------------------------------------

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      {/* ======================================================
          ACCOUNT BUTTON
      ======================================================= */}

      <button
        type="button"
        id={menuId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() =>
          setOpen((value) => !value)
        }
        className={`
          group
          inline-flex
          items-center
          justify-center
          transition-opacity
          duration-200
          hover:opacity-60

          ${
            isLabelled
              ? 'min-h-11 px-2'
              : 'h-10 w-10'
          }
        `}
      >
        <span
          className="
            flex
            flex-col
            items-center
            justify-center
          "
        >
          <span
            className="
              flex
              items-center
              justify-center
            "
          >
            <AccountIcon
              onDarkHero={onDarkHero}
              open={open}
            />

            {isLabelled && (
              <ChevronIcon
                open={open}
                onDarkHero={
                  onDarkHero
                }
              />
            )}
          </span>

          {isLabelled && (
            <AccountLabel
              onDarkHero={onDarkHero}
            />
          )}
        </span>
      </button>

      {/* ======================================================
          ACCOUNT DROPDOWN
      ======================================================= */}

      {open && (
        <div
          role="menu"
          aria-labelledby={menuId}
          className="
            absolute
            right-0
            top-[calc(100%+0.7rem)]
            z-[60]
            w-[190px]
            overflow-hidden
            border
            border-[#1b0b12]/10
            bg-[#fffdfb]
            shadow-[0_16px_45px_rgba(27,11,18,0.10)]
          "
        >
          {/* -----------------------------------------------
              ACCOUNT HEADER
          ------------------------------------------------ */}

          <div
            className="
              border-b
              border-[#1b0b12]/8
              px-4
              py-4
            "
          >
            <p
              className="
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#9b8c90]
              "
            >
              My account
            </p>

            {profile?.name && (
              <p
                className="
                  mt-1
                  truncate
                  font-serif
                  text-[15px]
                  text-[#1b0b12]
                "
              >
                {profile.name}
              </p>
            )}

            {!profile?.name &&
              user?.email && (
                <p
                  className="
                    mt-1
                    truncate
                    text-[10px]
                    text-[#75696d]
                  "
                >
                  {user.email}
                </p>
              )}
          </div>

          {/* -----------------------------------------------
              ORDERS
          ------------------------------------------------ */}

          <NavLink
            to="/account/orders"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className={({ isActive }) =>
              `
                ${itemClass}
                ${
                  isActive
                    ? 'bg-[#f7f3ee] text-[#3d0a21]'
                    : ''
                }
              `
            }
          >
            <span className="flex-1">
              My orders
            </span>

            <span
              className="
                text-[#aaa0a2]
                transition-transform
                duration-200
                group-hover:translate-x-0.5
              "
            >
              →
            </span>
          </NavLink>

          {/* -----------------------------------------------
              ADMIN
          ------------------------------------------------ */}

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
              <span className="flex-1">
                Admin dashboard
              </span>

              <span className="text-[#aaa0a2]">
                →
              </span>
            </Link>
          )}

          {/* -----------------------------------------------
              SIGN OUT
          ------------------------------------------------ */}

          <div
            className="
              border-t
              border-[#1b0b12]/8
            "
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onNavigate?.()
                void logout()
              }}
              className={`
                ${itemClass}
                text-[#76505d]
                hover:bg-[#faf3f5]
              `}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}