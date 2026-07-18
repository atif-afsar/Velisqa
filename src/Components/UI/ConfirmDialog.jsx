import { createPortal } from 'react-dom'
import { useEffect, useId, useState } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
  children,
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel?.()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, onCancel])

  if (!mounted || !open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-800 text-white hover:bg-red-900'
      : variant === 'primary'
        ? 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
        : 'bg-[#3d0a21] text-white hover:bg-[#2a0718]'

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-[#130006]/70 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-[#d4af37]/20 bg-[#fbf7f1] p-5 shadow-[0_24px_80px_rgba(19,0,6,0.35)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-serif text-xl font-semibold text-[#130006]">
          {title}
        </h2>
        {message ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#514347]">{message}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 rounded-full border border-[#3d0a21]/20 px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#3d0a21] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`min-h-11 rounded-full px-5 text-xs font-bold uppercase tracking-[0.08em] disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
