import { buildImageUrl } from '../../lib/imageCdn'
import {
  CHECKOUT_DELIVERY_CHARGE,
  formatInr,
  getCartLineSubtotal,
  getCartTotal,
  getCheckoutGrandTotal,
} from '../../lib/cartStock'

function PreviewImage({ src, alt, className = 'h-10 w-10 rounded-md' }) {
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-[#f1ede8] text-[8px] font-medium uppercase tracking-wider text-[#847377] ${className}`}
        aria-hidden
      >
        —
      </div>
    )
  }

  const optimized = buildImageUrl(src, { width: 96, quality: 70 })

  return (
    <img
      src={optimized}
      alt={alt}
      width={40}
      height={40}
      loading="eager"
      decoding="async"
      className={`shrink-0 object-cover object-center ${className}`}
      onError={(e) => {
        if (e.currentTarget.src !== src) e.currentTarget.src = src
      }}
    />
  )
}

function OrderPriceBreakdown({ subtotal, deliveryCharge = CHECKOUT_DELIVERY_CHARGE }) {
  const grandTotal = getCheckoutGrandTotal(subtotal)
  const isFreeDelivery = deliveryCharge <= 0

  return (
    <div className="mt-2 space-y-1 border-t border-[#d4af37]/15 pt-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#514347]">Subtotal</span>
        <span className="font-medium tabular-nums text-[#130006]">{formatInr(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#514347]">Delivery</span>
        {isFreeDelivery ? (
          <span className="font-semibold tabular-nums text-[#2d6a4f]">
            FREE <span className="font-normal text-[#847377]">(₹0)</span>
          </span>
        ) : (
          <span className="font-medium tabular-nums text-[#130006]">{formatInr(deliveryCharge)}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#d4af37]/10 pt-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#3d0a21]">
          Grand total
        </span>
        <span className="font-serif text-base font-semibold tabular-nums text-[#3d0a21]">
          {formatInr(grandTotal)}
        </span>
      </div>
    </div>
  )
}

export default function OrderProductPreview({
  productName,
  productImage,
  productPrice,
  cartItems = null,
}) {
  const isCart = Array.isArray(cartItems) && cartItems.length > 0

  if (isCart) {
    const subtotal = getCartTotal(cartItems)
    const pieceCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const maxVisible = 3
    const visibleItems = cartItems.slice(0, maxVisible)
    const hiddenCount = cartItems.length - visibleItems.length

    return (
      <div className="rounded-lg border border-[#d4af37]/15 bg-white/70 px-2.5 py-2">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#847377]">
          Your bag · {pieceCount} pc{pieceCount === 1 ? '' : 's'}
        </p>

        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.productId} className="flex min-w-0 items-center gap-2">
              <PreviewImage src={item.imageUrl} alt={item.name} />
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#130006]">{item.name}</p>
              <span className="shrink-0 text-[10px] tabular-nums text-[#847377]">×{item.quantity}</span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#6f334a]">
                {formatInr(getCartLineSubtotal(item))}
              </span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-[10px] font-medium text-[#847377]">+{hiddenCount} more in bag</li>
          )}
        </ul>

        <OrderPriceBreakdown subtotal={subtotal} />
      </div>
    )
  }

  if (!productName && !productImage) return null

  const subtotal = productPrice != null && Number(productPrice) > 0 ? Number(productPrice) : 0

  return (
    <div className="rounded-lg border border-[#d4af37]/15 bg-white/70 px-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <PreviewImage
          src={productImage}
          alt={productName || 'Product'}
          className="h-11 w-11 rounded-md sm:h-12 sm:w-12"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#847377]">
            You&apos;re ordering
          </p>
          <p className="line-clamp-1 font-serif text-sm leading-snug text-[#130006]">{productName}</p>
        </div>
      </div>

      {subtotal > 0 && <OrderPriceBreakdown subtotal={subtotal} />}
    </div>
  )
}
