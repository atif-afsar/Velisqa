import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatInr } from '../../lib/cartStock'

export default function OrderConfirmation({
  variant = 'cod',
  customerName,
  orderRef,
  trackUrl = null,
  productName,
  total,
  onClose,
}) {
  const isOnline = variant === 'online'
  const isEnquiry = variant === 'enquiry'

  return (
    <motion.div
      key="confirmation"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 text-center [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-8">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2d6a4f] to-[#1b4332] shadow-[0_12px_32px_rgba(45,106,79,0.35)]"
          aria-hidden
        >
          {isOnline ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#f7ead0]">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#f7ead0]">
              <path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                fill="currentColor"
              />
            </svg>
          )}
        </motion.div>

        <h2 className="mt-5 font-serif text-xl leading-tight text-[#130006] sm:text-2xl">
          {isEnquiry
            ? 'Thank you for your interest'
            : isOnline
              ? 'Almost there!'
              : 'Order placed successfully'}
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#514347]">
          {isEnquiry ? (
            <>
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}. We&apos;ve received your enquiry
              and will reach out shortly with availability and delivery details.
            </>
          ) : isOnline ? (
            <>
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}. Complete the UPI QR payment
              and submit your screenshot so our team can verify the order.
            </>
          ) : (
            <>
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}. Your order is confirmed.
              Our concierge will verify stock and contact you within 24 hours. Pay cash when your piece arrives.
            </>
          )}
        </p>

        {(orderRef || productName || total != null) && (
          <div className="mx-auto mt-5 max-w-xs rounded-xl border border-[#d4af37]/25 bg-white/70 px-4 py-3 text-left shadow-sm">
            {orderRef && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#847377]">
                Order reference
              </p>
            )}
            {orderRef && (
              <p className="mt-0.5 font-mono text-sm font-medium text-[#3d0a21]">{orderRef}</p>
            )}
            {productName && (
              <p className={`text-xs text-[#514347] ${orderRef ? 'mt-2 border-t border-[#d4af37]/15 pt-2' : ''}`}>
                {productName}
              </p>
            )}
            {total != null && (
              <p className="mt-1 font-serif text-base font-medium tabular-nums text-[#3d0a21]">
                {formatInr(total)}
              </p>
            )}
          </div>
        )}

        {!isOnline && !isEnquiry && (
          <p className="mx-auto mt-4 max-w-xs text-[11px] leading-snug text-[#847377]">
            Your order is saved. Keep your phone handy — we&apos;ll confirm stock and delivery soon.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-[#d4af37]/15 bg-[#fbf7f1] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        {trackUrl && !isOnline && !isEnquiry ? (
          <Link
            to={trackUrl}
            onClick={onClose}
            className="tap-target inline-flex h-11 w-full items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#2A0718] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f7ead0] shadow-[0_8px_24px_rgba(42,7,24,0.35)] transition hover:bg-[#3d0a21] sm:h-12 sm:text-xs"
          >
            Track order
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="tap-target inline-flex h-11 w-full items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#2A0718] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f7ead0] shadow-[0_8px_24px_rgba(42,7,24,0.35)] transition hover:bg-[#3d0a21] sm:h-12 sm:text-xs"
          >
            Continue shopping
          </button>
        )}
        <Link
          to="/collections"
          onClick={onClose}
          className="tap-target mt-2 flex h-10 w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f334a] transition hover:text-[#3d0a21]"
        >
          Browse collections
        </Link>
      </div>
    </motion.div>
  )
}
