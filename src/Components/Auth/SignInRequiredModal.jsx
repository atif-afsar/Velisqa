import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { getLenis } from '../../lib/smoothScrollState'
import SignInForm from './SignInForm'

export default function SignInRequiredModal({ open, onClose }) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    const lenis = getLenis()
    lenis?.stop()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
      lenis?.start()
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="sign-in-required"
          className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#130006]/75 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="Close sign in"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-lenis-prevent
            className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#d4af37]/20 bg-[#fbf7f1] shadow-[0_24px_80px_rgba(19,0,6,0.35)] sm:max-h-[min(88vh,720px)] sm:rounded-2xl"
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#d4af37]/15 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#847377] sm:text-[10px]">
                  Velisqa
                </p>
                <h2 id={titleId} className="mt-1 font-serif text-lg leading-tight text-[#130006] sm:text-2xl">
                  Sign in to checkout
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#514347] sm:text-sm">
                  Sign in to checkout. Your bag is saved on this device until you complete your order.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#130006]/10 text-xl leading-none text-[#130006] transition hover:bg-[#130006]/5"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <SignInForm idPrefix="modal-signin" />
              <p className="mt-4 text-center text-[10px] text-[#847377]">
                Prefer the full page?{' '}
                <Link
                  to="/login"
                  onClick={onClose}
                  className="font-semibold text-[#6f334a] underline-offset-2 hover:underline"
                >
                  Open sign in page
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
