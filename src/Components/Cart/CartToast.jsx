import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function CartToast() {
  const { toast, dismissToast, itemCount } = useCart()

  if (!toast || typeof document === 'undefined') return null

  const isError = toast.type === 'error'

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--nav-height)+0.5rem)] z-[180] flex justify-center px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-sm flex-col gap-2  border px-4 py-3  sm:flex-row sm:items-center sm:gap-3 ${
          isError
            ? 'border-red-200/80 bg-red-50 text-red-950'
            : 'border-line bg-mist text-ink'
        }`}
      >
        <p className="flex-1 text-sm leading-snug">{toast.message}</p>
        {!isError && itemCount > 0 && (
          <Link
            to="/cart"
            onClick={dismissToast}
            className="shrink-0 bg-ink px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-ink"
          >
            View bag ({itemCount})
          </Link>
        )}
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 self-end text-lg leading-none opacity-50 transition hover:opacity-100 sm:self-center"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>,
    document.body,
  )
}
