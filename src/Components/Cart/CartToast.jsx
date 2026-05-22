import { createPortal } from 'react-dom'
import { useCart } from '../../context/CartContext'

export default function CartToast() {
  const { toast, dismissToast } = useCart()

  if (!toast || typeof document === 'undefined') return null

  const isError = toast.type === 'error'

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--nav-height)+0.75rem)] z-[180] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_16px_48px_rgba(19,0,6,0.18)] ${
          isError
            ? 'border-red-200/80 bg-red-50 text-red-950'
            : 'border-[#d4af37]/35 bg-[#fbf7f1] text-[#130006]'
        }`}
      >
        <p className="flex-1 text-sm leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 text-lg leading-none opacity-50 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>,
    document.body,
  )
}
