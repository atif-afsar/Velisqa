import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext'

export default function WishlistToast() {
  const { toast, dismissToast, wishlistCount } = useWishlist()

  if (!toast || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--nav-height)+4.25rem)] z-[175] flex justify-center px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-xl border border-[#3d0a21]/15 bg-white px-4 py-3 text-sm text-[#130006] shadow-[0_16px_48px_rgba(19,0,6,0.15)]">
        <p className="flex-1 leading-snug">{toast.message}</p>
        {wishlistCount > 0 && (
          <Link
            to="/wishlist"
            onClick={dismissToast}
            className="shrink-0 rounded-full border border-[#3d0a21]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3d0a21] transition hover:bg-[#3d0a21]/5"
          >
            View ({wishlistCount})
          </Link>
        )}
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
